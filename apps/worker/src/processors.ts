import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { OnEvent } from "@nestjs/event-emitter";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { EVENTS, InvoiceReadyEvent, JobCompletedEvent, JsonLogger, QUEUES, refreshKpis, runWithContext } from "@fss/shared";
import { REDIS, PrismaService } from "./core.module";
import { InvoiceService } from "./invoice.service";

@Processor(QUEUES.invoicePdf)
export class InvoicePdfProcessor extends WorkerHost {
  constructor(private readonly invoices: InvoiceService) {
    super();
  }
  process(job: Job<JobCompletedEvent>) {
    return this.invoices.process(job.data);
  }
}

/** InvoiceReady (domain event) -> notifications queue. */
@Injectable()
export class InvoiceReadyListener {
  constructor(@InjectQueue(QUEUES.notifications) private readonly queue: Queue) {}

  @OnEvent(EVENTS.invoiceReady)
  async onReady(e: InvoiceReadyEvent) {
    await this.queue.add("invoice-ready", e);
  }
}

@Processor(QUEUES.notifications)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new JsonLogger("worker");
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /** Email delivery is simulated: we only log what would be sent. */
  process(job: Job<InvoiceReadyEvent>) {
    const e = job.data;
    return runWithContext({ companyId: e.companyId, requestId: e.requestId }, async () => {
      const j = await this.prisma.db.job.findUniqueOrThrow({ where: { id: e.jobId }, include: { customer: true } });
      this.logger.log("Email to customer: invoice ready", { to: j.customer.email ?? j.customer.name, invoiceId: e.invoiceId });
    });
  }
}

@Processor(QUEUES.kpiRefresh)
export class KpiRefreshProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new JsonLogger("worker");
  constructor(
    @InjectQueue(QUEUES.kpiRefresh) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {
    super();
  }

  /** Repeatable job: refresh every company's cached KPIs. */
  async onModuleInit() {
    await this.queue.upsertJobScheduler("kpi-refresh-all", { every: 30_000 }, { name: "refresh" });
  }

  async process() {
    const companies = await this.prisma.raw.company.findMany({ select: { id: true } });
    for (const c of companies) await refreshKpis(this.prisma.raw, this.redis, c.id);
    this.logger.log("kpis refreshed", { companies: companies.length });
  }
}
