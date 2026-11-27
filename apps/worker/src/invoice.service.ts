import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import PDFDocument from "pdfkit";
import { EVENTS, InvoiceReadyEvent, JobCompletedEvent, JsonLogger, putObject, runWithContext } from "@fss/shared";
import { PUT_OBJECT, PrismaService } from "./core.module";

export interface InvoiceView {
  id: string;
  total: number;
  companyName: string;
  customerName: string;
  jobTitle: string;
  items: { description: string; qty: number; unitPrice: number; taxPercent: number }[];
}

const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;

export function renderInvoicePdf(inv: InvoiceView): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(22).text(inv.companyName).moveDown(0.3);
    doc.fontSize(14).text(`Invoice ${inv.id.slice(0, 8).toUpperCase()}`).moveDown();
    doc.fontSize(11).text(`Customer: ${inv.customerName}`).text(`Job: ${inv.jobTitle}`).moveDown();
    for (const i of inv.items) {
      doc.text(`${i.description}  x${i.qty}  @ ${yen(i.unitPrice)}  (tax ${i.taxPercent}%)`);
    }
    doc.moveDown().fontSize(16).text(`Total: ${yen(inv.total)}`);
    doc.end();
  });
}

@Injectable()
export class InvoiceService {
  private readonly logger = new JsonLogger("worker");

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    @Inject(PUT_OBJECT) private readonly put: typeof putObject,
  ) {}

  /** JobCompleted -> render PDF -> S3 -> mark ready -> emit InvoiceReady. Runs in the job's tenant + request context. */
  process(e: JobCompletedEvent) {
    return runWithContext({ companyId: e.companyId, requestId: e.requestId }, async () => {
      const invoice = await this.prisma.db.invoice.findUniqueOrThrow({ where: { id: e.invoiceId } });
      const job = await this.prisma.db.job.findUniqueOrThrow({
        where: { id: invoice.jobId },
        include: { customer: true, quote: { include: { items: true } } },
      });
      const company = await this.prisma.raw.company.findUniqueOrThrow({ where: { id: e.companyId } });

      const pdf = await renderInvoicePdf({
        id: invoice.id,
        total: invoice.total,
        companyName: company.name,
        customerName: job.customer.name,
        jobTitle: job.title,
        items: job.quote.items,
      });
      const pdfKey = `invoices/${e.companyId}/${invoice.id}.pdf`;
      await this.put(pdfKey, pdf, "application/pdf");
      await this.prisma.db.invoice.update({ where: { id: invoice.id }, data: { status: "ready", pdfKey, readyAt: new Date() } });
      this.logger.log("invoice pdf uploaded", { invoiceId: invoice.id, pdfKey, bytes: pdf.length });

      const ready: InvoiceReadyEvent = { companyId: e.companyId, invoiceId: invoice.id, jobId: job.id, requestId: e.requestId };
      await this.events.emitAsync(EVENTS.invoiceReady, ready);
      return { pdfKey };
    });
  }
}
