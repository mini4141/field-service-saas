import { Global, Injectable, Module, OnModuleDestroy } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { DEFAULT_JOB_OPTIONS, QUEUES, TenantPrisma, createTenantPrisma, putObject } from "@fss/shared";

export const REDIS = "REDIS";
export const PUT_OBJECT = "PUT_OBJECT";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

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
    BullModule.forRoot({
      connection: { host: redisUrl.hostname, port: Number(redisUrl.port || 6379), password: redisUrl.password || undefined },
    }),
    BullModule.registerQueue(...Object.values(QUEUES).map((name) => ({ name, defaultJobOptions: DEFAULT_JOB_OPTIONS }))),
  ],
  providers: [
    PrismaService,
    { provide: REDIS, useFactory: () => new Redis(process.env.REDIS_URL ?? "redis://localhost:6379") },
    { provide: PUT_OBJECT, useValue: putObject },
  ],
  exports: [PrismaService, REDIS, PUT_OBJECT, BullModule],
})
export class CoreModule {}
