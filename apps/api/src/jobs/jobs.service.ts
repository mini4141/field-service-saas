import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Redis from "ioredis";
import { EVENTS, JobCompletedEvent, currentContext, kpiKey, presignGet } from "@fss/shared";
import { PrismaService, REDIS } from "../core/core.module";
import { AuthUser } from "../common/decorators";
import { CompleteJobDto, ScheduleJobDto } from "../dto/requests.dto";

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  list(user: AuthUser, q: { from?: string; to?: string; status?: string }) {
    const where: any = {};
    if (user.role === "field") where.assigneeId = user.sub;
    if (q.status) where.status = q.status;
    if (q.from || q.to) where.scheduledAt = { ...(q.from && { gte: new Date(q.from) }), ...(q.to && { lt: new Date(q.to) }) };
    return this.prisma.db.job.findMany({ where, include: { customer: true, invoice: true }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }] });
  }

  /** Loads one job; field staff may only see jobs assigned to them. */
  private async load(id: string, user: AuthUser) {
    const job = await this.prisma.db.job.findUnique({ where: { id }, include: { customer: true, invoice: true, photos: true } });
    if (!job) throw new NotFoundException();
    if (user.role === "field" && job.assigneeId !== user.sub) throw new ForbiddenException("Not your job");
    return job;
  }

  async get(id: string, user: AuthUser) {
    const job = await this.load(id, user);
    const photos = await Promise.all(
      job.photos.map(async (p) => ({
        id: p.id,
        url: await presignGet(p.key),
        thumbUrl: p.thumbKey ? await presignGet(p.thumbKey) : null,
      })),
    );
    return { ...job, photos };
  }

  async schedule(id: string, dto: ScheduleJobDto) {
    const job = await this.prisma.db.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException();
    const assignee = await this.prisma.db.user.findUnique({ where: { id: dto.assigneeId } });
    if (!assignee || assignee.role !== "field") throw new NotFoundException("Assignee must be a field user");
    return this.prisma.db.job.update({
      where: { id },
      data: { scheduledAt: new Date(dto.scheduledAt), assigneeId: dto.assigneeId, status: "scheduled" },
      include: { customer: true },
    });
  }

  async checkin(id: string, user: AuthUser) {
    await this.load(id, user);
    return this.prisma.db.job.update({ where: { id }, data: { status: "in_progress", checkedInAt: new Date() } });
  }

  /** Completes the job, creates the pending invoice and emits JobCompleted (queue work happens in a listener). */
  async complete(id: string, user: AuthUser, dto: CompleteJobDto) {
    const job = await this.load(id, user);
    if (job.status === "completed") return job;
    const quote = await this.prisma.db.quote.findUniqueOrThrow({ where: { id: job.quoteId } });
    const done = await this.prisma.db.job.update({
      where: { id },
      data: { status: "completed", completedAt: new Date(), notes: dto.notes ?? job.notes },
    });
    const invoice = await this.prisma.db.invoice.create({ data: { jobId: id, total: quote.total } as any });
    await this.prisma.db.auditLog.create({
      data: { userId: user.sub, action: "job.complete", entity: "Job", entityId: id, requestId: currentContext()?.requestId } as any,
    });
    await this.redis.del(kpiKey(user.companyId));
    const event: JobCompletedEvent = { companyId: user.companyId, jobId: id, invoiceId: invoice.id, requestId: currentContext()?.requestId ?? "unknown" };
    await this.events.emitAsync(EVENTS.jobCompleted, event);
    return { ...done, invoice };
  }
}
