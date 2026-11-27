export const QUEUES = {
  invoicePdf: "invoice-pdf",
  notifications: "notifications",
  kpiRefresh: "kpi-refresh",
} as const;

export const EVENTS = {
  jobCompleted: "job.completed",
  invoiceReady: "invoice.ready",
} as const;

export interface JobCompletedEvent { companyId: string; jobId: string; invoiceId: string; requestId: string }
export interface InvoiceReadyEvent { companyId: string; invoiceId: string; jobId: string; requestId: string }

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};
