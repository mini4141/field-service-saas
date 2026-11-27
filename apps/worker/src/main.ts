import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { JsonLogger } from "@fss/shared";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const logger = new JsonLogger("worker");
  const app = await NestFactory.create(WorkerModule, { logger });
  const port = Number(process.env.WORKER_PORT ?? 4100);
  await app.listen(port, "0.0.0.0");
  logger.log(`worker consuming queues; health on ${port}`);
}

bootstrap();
