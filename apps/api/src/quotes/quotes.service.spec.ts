import { QuotesService } from "./quotes.service";

describe("QuotesService", () => {
  it("computes the quote total server-side (including per-line tax)", async () => {
    const create = jest.fn(async ({ data }) => ({ id: "q1", ...data }));
    const prisma: any = { db: { customer: { findUnique: async () => ({ id: "c1" }) }, quote: { create } } };
    const service = new QuotesService(prisma, {} as any);

    await service.create("co1", {
      customerId: "c1",
      title: "Deep clean",
      items: [
        { description: "Deep cleaning", qty: 1, unitPrice: 30000, taxPercent: 10 },
        { description: "Windows", qty: 2, unitPrice: 6000, taxPercent: 0 },
      ],
    });

    expect(create.mock.calls[0][0].data.total).toBe(45000);
  });
});
