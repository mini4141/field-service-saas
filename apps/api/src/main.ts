import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { JsonLogger } from "@fss/shared";
import { AppModule } from "./app.module";
import { configureApp, setupSwagger } from "./configure";
import { config } from "./config";

async function bootstrap() {
  const logger = new JsonLogger("api");
  const app = await NestFactory.create(AppModule, { rawBody: true, logger });
  configureApp(app);
  setupSwagger(app);
  await app.listen(config.port, "0.0.0.0");
  logger.log(`api listening on ${config.port}`);
}

bootstrap();
