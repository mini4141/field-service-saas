import { Controller, Get, Inject, Module } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import Redis from "ioredis";
import { kpiKey, refreshKpis } from "@fss/shared";
import { PrismaService, REDIS } from "../core/core.module";
import { AuthUser, CurrentUser, Roles } from "../common/decorators";
import { KpisDto } from "../dto/models.dto";

@ApiTags("dashboard")
@Roles("owner")
@Controller("dashboard")
class DashboardController {
  constructor(private readonly prisma: PrismaService, @Inject(REDIS) private readonly redis: Redis) {}

  /** Redis cache (TTL 60s); a miss computes the KPIs in SQL and refills it. */
  @Get("kpis") @ApiOkResponse({ type: KpisDto })
  async kpis(@CurrentUser() u: AuthUser) {
    const hit = await this.redis.get(kpiKey(u.companyId));
    if (hit) return { ...JSON.parse(hit), cached: true };
    return { ...(await refreshKpis(this.prisma.raw, this.redis, u.companyId)), cached: false };
  }
}

@Module({ controllers: [DashboardController] })
export class DashboardModule {}
