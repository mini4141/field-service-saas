import { InvoiceService } from "./invoice.service";

describe("InvoiceService", () => {
  it("renders a PDF, uploads it to S3 and marks the invoice ready", async () => {
    const update = jest.fn(async () => ({}));
    const prisma: any = {
      db: {
        invoice: { findUniqueOrThrow: async () => ({ id: "inv-1234567890", jobId: "j1", total: 45000 }), update },
        job: {
          findUniqueOrThrow: async () => ({
            id: "j1",
            title: "Office cleaning",
            customer: { name: "Yamada" },
            quote: { items: [{ description: "Deep cleaning", qty: 1, unitPrice: 45000, taxPercent: 0 }] },
          }),
        },
      },
      raw: { company: { findUniqueOrThrow: async () => ({ name: "Sakura Cleaning" }) } },
    };
    const put = jest.fn(async () => undefined);
    const emitAsync = jest.fn(async () => []);
    const service = new InvoiceService(prisma, { emitAsync } as any, put as any);

    const { pdfKey } = await service.process({ companyId: "co1", jobId: "j1", invoiceId: "inv-1234567890", requestId: "req-1" });

    expect(pdfKey).toBe("invoices/co1/inv-1234567890.pdf");
    const [key, body, type] = put.mock.calls[0] as unknown as [string, Buffer, string];
    expect(key).toBe(pdfKey);
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
    expect(type).toBe("application/pdf");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ready", pdfKey }) }));
    expect(emitAsync).toHaveBeenCalledWith("invoice.ready", expect.objectContaining({ invoiceId: "inv-1234567890" }));
  });
});
