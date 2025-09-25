import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import type { Response } from "express";

/**
 * Records every uncaught exception onto the request's active span before
 * NestJS's default handling takes over — this is what makes an error show
 * up as an error in the APM's trace view (not just a 500 in access logs),
 * which is the whole point of routing "errors" through OTel instead of a
 * separate error-tracking tool.
 */
@Catch()
export class OtelExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(exception instanceof Error ? exception : new Error(String(exception)));
      span.setStatus({ code: SpanStatusCode.ERROR });
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };

    response.status(status).json(body);
  }
}
