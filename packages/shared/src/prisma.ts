import { PrismaClient } from "@prisma/client";
import { currentContext } from "./context";

/** Models that carry companyId (every table except Company). */
const TENANT_MODELS = new Set(["User", "Customer", "Quote", "QuoteItem", "Job", "JobPhoto", "Invoice", "AuditLog"]);
const WHERE_OPS = new Set([
  "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "findMany",
  "update", "updateMany", "delete", "deleteMany", "count", "aggregate", "groupBy",
]);

/**
 * Builds a Prisma client whose queries are automatically scoped to the
 * companyId held in the AsyncLocalStorage request context. If no tenant is
 * in context the query is refused, so a forgotten scope can never leak data.
 */
export function createTenantPrisma(base: PrismaClient = new PrismaClient()) {
  return base.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          const companyId = currentContext()?.companyId;
          if (!companyId) throw new Error(`No tenant in context for ${model}.${operation}`);
          const a: any = args ?? {};
          if (WHERE_OPS.has(operation)) a.where = { ...(a.where ?? {}), companyId };
          if (operation === "create") a.data = { ...a.data, companyId };
          if (operation === "createMany") {
            a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d: any) => ({ ...d, companyId }));
          }
          return query(a);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof createTenantPrisma>;
export { PrismaClient };
