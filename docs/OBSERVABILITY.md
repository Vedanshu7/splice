# Observability

Two separate systems, each doing the thing it's actually good at:

- **PostHog** (web + mobile) — product analytics: pageviews/screens, custom events, user identity.
- **OpenTelemetry → APM** (API only) — traces, metrics, and logs+errors for the backend, all three signals exported over the OTLP protocol to an APM backend. Default target is [SigNoz](https://signoz.io) (self-hosted or cloud), chosen because it's built natively around OTLP ingestion rather than requiring a vendor-specific agent/SDK — but nothing in the code is SigNoz-specific; point the OTLP endpoint at Grafana Tempo/Loki/Mimir (via an OTel Collector), Honeycomb, or anything else that speaks OTLP, and it works the same way.

## PostHog setup

1. Create a project at [posthog.com](https://posthog.com) (or your self-hosted instance).
2. Set `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` (web) and `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_HOST` (mobile) to the project's API key and host.
3. That's it — both apps no-op cleanly if these are unset, so there's nothing to disable for local dev.

What's wired up:
- Web: `components/posthog-provider.tsx` — pageview capture on every App Router navigation (client-side routes don't fire a real page load, so this is manual rather than PostHog's default history-hook capture), plus `posthog.identify()`/`reset()` synced to Supabase auth state in `components/auth-provider.tsx`.
- Mobile: `components/PostHogProvider.tsx` — screen views and app lifecycle autocaptured by the SDK itself; identify/reset synced to auth state in `app/_layout.tsx`.

## OpenTelemetry → SigNoz setup

### Run SigNoz locally

```bash
git clone -b main https://github.com/SigNoz/signoz.git
cd signoz/deploy
./install.sh
```

This starts SigNoz's OTel Collector listening on `localhost:4318` (OTLP/HTTP) — the default the API's `.env.example` already assumes. Open `http://localhost:3301` for the SigNoz UI.

### Point the API at it

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=splice-api
```

For SigNoz Cloud or any other OTLP backend requiring auth, set `OTEL_EXPORTER_OTLP_HEADERS` (comma-separated `key=value` pairs, e.g. `signoz-ingestion-key=<token>`).

### What's instrumented

- **Traces**: HTTP/Express request spans, outgoing `pg` queries, outgoing `fetch`/`undici` calls (LLM providers, Stripe, Upstash's REST API) — all via `@opentelemetry/auto-instrumentations-node`, wired in `src/observability/tracing.ts`.
- **Metrics**: everything the auto-instrumentations emit by default, plus a hand-written example: `llm.call.duration` (histogram) and `llm.call.count` (counter), tagged by `provider`/`operation`/`outcome`, in `LlmService` — showing the OTel Metrics API used directly, not just picked up automatically.
- **Logs**: `OtelLoggerService` (`src/observability/otel-logger.service.ts`) replaces Nest's default logger — every `Logger.log/warn/error/...` call still prints to the console exactly as before, and is *also* emitted as an OTel log record, correlated to the active trace/span so a log line and the request it happened during show up joined together in SigNoz.
- **Errors**: `OtelExceptionFilter` (`src/observability/otel-exception.filter.ts`) records every uncaught exception onto the active span and marks it `ERROR` before Nest's normal error response goes out — this is what makes an exception show up as an error in SigNoz's trace view, not just a `500` line in an access log.

### Why this file order matters

`main.ts` imports `./observability/tracing` as its literal first line, before even `reflect-metadata`. Auto-instrumentation works by monkey-patching modules (`http`, `pg`, `undici`, ...) the moment they're `require()`'d — if Nest's own code imports those first, the patches never apply and the corresponding spans silently never appear.
