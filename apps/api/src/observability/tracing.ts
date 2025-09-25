/**
 * OpenTelemetry bootstrap: traces, metrics, and logs, all exported via OTLP
 * HTTP to an APM backend (SigNoz by default). This file must be imported
 * before any other application code — auto-instrumentation works by
 * monkey-patching modules (http, express, pg, undici) at `require()` time,
 * so if Nest's own modules import those first, the patches never apply.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { logs } from "@opentelemetry/api-logs";
import { parseOtlpHeaders } from "./parse-otlp-headers";

// SigNoz's OTel Collector (self-hosted default, or SigNoz Cloud's ingest
// endpoint) speaks OTLP/HTTP on this path structure. Any other OTLP-native
// backend (Grafana Tempo/Loki/Mimir via an OTel Collector, Honeycomb, etc.)
// works the same way — this file has no SigNoz-specific code, only the
// default endpoint value assumes it.
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "splice-api";
const headers = parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

const resource = defaultResource().merge(
  resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "0.1.0",
  }),
);

// Logs go through their own provider registered globally, so `OtelLoggerService`
// (the NestJS Logger replacement) can grab a logger via `logs.getLogger(...)`
// without needing NodeSDK to hand it back out.
const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter({ url: `${OTLP_ENDPOINT}/v1/logs`, headers }),
    }),
  ],
});
logs.setGlobalLoggerProvider(loggerProvider);

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces`, headers }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${OTLP_ENDPOINT}/v1/metrics`, headers }),
    exportIntervalMillis: 15_000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Every fs call becoming a span is noise, not signal, for an API service.
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  Promise.all([sdk.shutdown(), loggerProvider.shutdown()]).finally(() => process.exit(0));
});
