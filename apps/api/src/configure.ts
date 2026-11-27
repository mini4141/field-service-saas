import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { requestContextMiddleware } from "./common/request-context.middleware";

/** Shared by main.ts and the e2e tests so both run the identical pipeline. */
export function configureApp(app: INestApplication) {
  app.use(requestContextMiddleware);
  app.setGlobalPrefix("api/v1", { exclude: ["healthz"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });
}

export function buildOpenApi(app: INestApplication) {
  const doc = new DocumentBuilder()
    .setTitle("Field Service SaaS API")
    .setVersion("1.0")
    .addBearerAuth()
    .addServer("/")
    .build();
  return SwaggerModule.createDocument(app, doc);
}

export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup("api/docs", app, buildOpenApi(app));
}
