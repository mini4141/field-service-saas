import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { JwtModule } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { DEFAULT_JOB_OPTIONS, QUEUES, TenantPrisma, createTenantPrisma } from "@fss/shared";
import { config, redisConnection } from "../config";

export const REDIS = "REDIS";

/** `db` is tenant-scoped via AsyncLocalStorage; `raw` is for auth/public flows that run before a tenant is known. */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly raw = new PrismaClient();
  readonly db: TenantPrisma = createTenantPrisma(this.raw);
  async onModuleDestroy() {
    await this.raw.$disconnect();
  }
}

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    JwtModule.register({ global: true, secret: config.jwtSecret, signOptions: { expiresIn: "15m" } }),
    BullModule.forRoot({ connection: redisConnection() }),
    BullModule.registerQueue(
      ...Object.values(QUEUES).map((name) => ({ name, defaultJobOptions: DEFAULT_JOB_OPTIONS })),
    ),
  ],
  providers: [
    PrismaService,
    { provide: REDIS, useFactory: () => new Redis(config.redisUrl) },
  ],
  exports: [PrismaService, REDIS, BullModule],
})
export class CoreModule {}
