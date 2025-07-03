import { z } from "zod";

/**
 * Validates process.env at boot. Fails fast with a clear error instead of
 * letting a missing var surface later as a confusing runtime failure deep
 * inside a request handler.
 */
export const envSchema = z.object({
  // Supabase
  SUPABASE_JWT_SECRET: z.string().min(1, "SUPABASE_JWT_SECRET is required"),
  DATABASE_URL: z.string().url(),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),

  // LLM provider
  LLM_PROVIDER: z.enum(["openai", "anthropic", "gemini"]).default("openai"),
  LLM_EMBEDDING_PROVIDER: z.enum(["openai", "anthropic", "gemini"]).optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // API
  API_PORT: z.coerce.number().int().positive().default(4000),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Observability (OpenTelemetry -> APM, e.g. SigNoz). Optional: read directly
  // from process.env in observability/tracing.ts, which must run before the
  // Nest app (and therefore ConfigService) exists — listed here only so `Env`
  // documents what the app reads and so other code can use ConfigService for
  // the same values if it ever needs to.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default("http://localhost:4318"),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default("splice-api"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/** The validated, typed shape of `process.env` this app actually reads. */
export type Env = z.infer<typeof envSchema>;

/** Passed to `ConfigModule.forRoot({ validate })`; throws with a readable message on failure. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
