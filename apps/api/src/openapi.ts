import "reflect-metadata";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { buildOpenApi, configureApp } from "./configure";

/** Generates apps/api/openapi.json without connecting to Postgres or Redis (preview mode). */
async function main() {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });
  configureApp(app);
  const doc = buildOpenApi(app);
  writeFileSync(join(__dirname, "..", "openapi.json"), JSON.stringify(doc, null, 2) + "\n");
  await app.close();
}

main();
