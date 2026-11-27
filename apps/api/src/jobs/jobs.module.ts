import { Body, Controller, Get, HttpCode, Injectable, Module, Param, Patch, Post, Query } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { OnEvent } from "@nestjs/event-emitter";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Queue } from "bullmq";
import { EVENTS, JobCompletedEvent, QUEUES } from "@fss/shared";
import { JobsService } from "./jobs.service";
import { AuthUser, CurrentUser, Roles } from "../common/decorators";
import { CompleteJobDto, ScheduleJobDto } from "../dto/requests.dto";
import { JobDto } from "../dto/models.dto";

@ApiTags("jobs")
@Controller("jobs")
class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get() @ApiQuery({ name: "from", required: false }) @ApiQuery({ name: "to", required: false }) @ApiQuery({ name: "status", required: false })
  @ApiOkResponse({ type: [JobDto] })
  list(@CurrentUser() u: AuthUser, @Query("from") from?: string, @Query("to") to?: string, @Query("status") status?: string) {
    return this.jobs.list(u, { from, to, status });
  }

  @Get(":id") @ApiOkResponse({ type: JobDto })
  get(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.jobs.get(id, u);
  }

  @Patch(":id/schedule") @Roles("owner", "office") @ApiOkResponse({ type: JobDto })
  schedule(@Param("id") id: string, @Body() dto: ScheduleJobDto) {
    return this.jobs.schedule(id, dto);
  }

  @Post(":id/checkin") @HttpCode(200) @ApiOkResponse({ type: JobDto })
  checkin(@CurrentUser() u: AuthUser, @Param("id") id: string) {
    return this.jobs.checkin(id, u);
  }

  @Post(":id/complete") @HttpCode(200) @ApiOkResponse({ type: JobDto })
  complete(@CurrentUser() u: AuthUser, @Param("id") id: string, @Body() dto: CompleteJobDto) {
    return this.jobs.complete(id, u, dto);
  }
}

/** JobCompleted -> invoice-pdf queue. Controllers never render PDFs themselves. */
@Injectable()
class JobCompletedListener {
  constructor(@InjectQueue(QUEUES.invoicePdf) private readonly queue: Queue) {}

  @OnEvent(EVENTS.jobCompleted)
  async onCompleted(e: JobCompletedEvent) {
    await this.queue.add("render", e);
  }
}

@Module({ controllers: [JobsController], providers: [JobsService, JobCompletedListener] })
export class JobsModule {}
