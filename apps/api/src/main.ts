// Must be the very first import: auto-instrumentation patches modules
// (http, express, pg, undici) at require() time, so it has to run before
// anything else pulls those modules in.
import "./observability/tracing";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { OtelLoggerService } from "./observability/otel-logger.service";
import { OtelExceptionFilter } from "./observability/otel-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new OtelLoggerService(),
  });
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new OtelExceptionFilter());

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`splice API listening on :${port}`);
}

bootstrap();
