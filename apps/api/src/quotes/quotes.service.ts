import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import Redis from "ioredis";
import { kpiKey, quoteTotal, runWithContext } from "@fss/shared";
import { PrismaService, REDIS } from "../core/core.module";
import { CreateQuoteDto } from "../dto/requests.dto";

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService, @Inject(REDIS) private readonly redis: Redis) {}

  /** Total is always computed server-side from the line items. */
  async create(companyId: string, dto: CreateQuoteDto) {
    const customer = await this.prisma.db.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException("Customer not found");
    return this.prisma.db.quote.create({
      data: {
        customerId: dto.customerId,
        title: dto.title,
        total: quoteTotal(dto.items),
        items: { create: dto.items.map((i) => ({ ...i, companyId })) },
      } as any,
      include: { items: true, customer: true },
    });
  }

  list() {
    return this.prisma.db.quote.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } });
  }

  async get(id: string) {
    const q = await this.prisma.db.quote.findUnique({ where: { id }, include: { items: true, customer: true } });
    if (!q) throw new NotFoundException();
    return q;
  }

  async send(id: string, companyId: string) {
    await this.get(id);
    const q = await this.prisma.db.quote.update({
      where: { id },
      data: { status: "sent", sentAt: new Date() },
      include: { items: true, customer: true },
    });
    await this.redis.del(kpiKey(companyId));
    return q;
  }

  /** Public flow: the customer opens /q/<token>. No JWT, so the tenant is derived from the token's quote. */
  async publicView(token: string) {
    const q = await this.prisma.raw.quote.findUnique({
      where: { token },
      include: { items: true, customer: true, company: true },
    });
    if (!q || q.status === "draft") throw new NotFoundException();
    return { title: q.title, status: q.status, total: q.total, companyName: q.company.name, customerName: q.customer.name, items: q.items };
  }

  async accept(token: string) {
    const q = await this.prisma.raw.quote.findUnique({ where: { token }, include: { customer: true } });
    if (!q || q.status === "draft") throw new NotFoundException();
    if (q.status === "accepted") return this.publicView(token);
    await runWithContext({ companyId: q.companyId }, async () => {
      await this.prisma.db.quote.update({ where: { id: q.id }, data: { status: "accepted", acceptedAt: new Date() } });
      await this.prisma.db.job.create({
        data: { quoteId: q.id, customerId: q.customerId, title: q.title, address: q.customer.address, status: "unscheduled" } as any,
      });
    });
    await this.redis.del(kpiKey(q.companyId));
    return this.publicView(token);
  }
}
