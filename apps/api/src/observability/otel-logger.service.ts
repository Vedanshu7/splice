import { ConsoleLogger, Injectable, LogLevel } from "@nestjs/common";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { context } from "@opentelemetry/api";

const SEVERITY_BY_LEVEL: Record<LogLevel, SeverityNumber> = {
  verbose: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  log: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
  fatal: SeverityNumber.FATAL,
};

/**
 * NestJS logger that does everything `ConsoleLogger` does (so local `pnpm dev:api`
 * output is unchanged) and additionally emits each entry as an OTel log record.
 * Passing the active `context` means a log written inside a request handler is
 * automatically correlated to that request's trace/span in the APM UI, instead
 * of logs and traces being two disconnected data sources.
 */
@Injectable()
export class OtelLoggerService extends ConsoleLogger {
  private readonly otelLogger = logs.getLogger("splice-api");

  private emit(level: LogLevel, message: unknown, ctx?: string) {
    this.otelLogger.emit({
      severityNumber: SEVERITY_BY_LEVEL[level],
      severityText: level,
      body: typeof message === "string" ? message : JSON.stringify(message),
      attributes: ctx ? { context: ctx } : undefined,
      context: context.active(),
    });
  }

  override log(message: unknown, ctx?: string) {
    super.log(message, ctx);
    this.emit("log", message, ctx);
  }

  override error(message: unknown, stackOrContext?: string, ctx?: string) {
    super.error(message, stackOrContext, ctx);
    this.emit("error", message, ctx ?? stackOrContext);
  }

  override warn(message: unknown, ctx?: string) {
    super.warn(message, ctx);
    this.emit("warn", message, ctx);
  }

  override debug(message: unknown, ctx?: string) {
    super.debug(message, ctx);
    this.emit("debug", message, ctx);
  }

  override verbose(message: unknown, ctx?: string) {
    super.verbose(message, ctx);
    this.emit("verbose", message, ctx);
  }
}
