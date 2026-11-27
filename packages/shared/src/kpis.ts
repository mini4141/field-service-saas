import { PrismaClient } from "@prisma/client";
import type Redis from "ioredis";

export interface Kpis {
  quotesSent: number;
  quotesAccepted: number;
  conversionPercent: number;
  jobsCompletedThisWeek: number;
  revenueInvoiced: number;
  avgSecondsCompletionToInvoice: number | null;
  computedAt: string;
}

export const KPI_TTL_SECONDS = 60;
export const kpiKey = (companyId: string) => `kpis:${companyId}`;

/** KPIs are computed in SQL, scoped by companyId. */
export async function computeKpis(db: PrismaClient, companyId: string): Promise<Kpis> {
  const [r] = await db.$queryRaw<any[]>`
    SELECT
      (SELECT count(*) FROM "Quote" WHERE "companyId" = ${companyId} AND status IN ('sent','accepted'))::int AS sent,
      (SELECT count(*) FROM "Quote" WHERE "companyId" = ${companyId} AND status = 'accepted')::int AS accepted,
      (SELECT count(*) FROM "Job" WHERE "companyId" = ${companyId} AND status = 'completed'
         AND "completedAt" >= date_trunc('week', now()))::int AS completed,
      (SELECT coalesce(sum(total), 0) FROM "Invoice" WHERE "companyId" = ${companyId})::int AS revenue,
      (SELECT avg(extract(epoch FROM (i."readyAt" - j."completedAt")))
         FROM "Invoice" i JOIN "Job" j ON j.id = i."jobId"
         WHERE i."companyId" = ${companyId} AND i.status = 'ready')::float AS avg_seconds`;
  return {
    quotesSent: r.sent,
    quotesAccepted: r.accepted,
    conversionPercent: r.sent ? Math.round((r.accepted / r.sent) * 100) : 0,
    jobsCompletedThisWeek: r.completed,
    revenueInvoiced: r.revenue,
    avgSecondsCompletionToInvoice: r.avg_seconds === null ? null : Math.round(r.avg_seconds * 10) / 10,
    computedAt: new Date().toISOString(),
  };
}

export async function refreshKpis(db: PrismaClient, redis: Redis, companyId: string): Promise<Kpis> {
  const kpis = await computeKpis(db, companyId);
  await redis.set(kpiKey(companyId), JSON.stringify(kpis), "EX", KPI_TTL_SECONDS);
  return kpis;
}
