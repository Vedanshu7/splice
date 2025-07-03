import { validateEnv } from "./env.schema";

const validEnv = {
  SUPABASE_JWT_SECRET: "secret",
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRO_PRICE_ID: "price_123",
};

describe("validateEnv", () => {
  it("accepts a complete, valid environment and applies defaults", () => {
    const result = validateEnv(validEnv);
    expect(result.LLM_PROVIDER).toBe("openai");
    expect(result.API_PORT).toBe(4000);
    expect(result.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("throws with a readable message when a required var is missing", () => {
    const { SUPABASE_JWT_SECRET: _omit, ...rest } = validEnv;
    expect(() => validateEnv(rest)).toThrow(/SUPABASE_JWT_SECRET/);
  });

  it("rejects an invalid LLM_PROVIDER value", () => {
    expect(() => validateEnv({ ...validEnv, LLM_PROVIDER: "not-a-real-provider" })).toThrow();
  });

  it("coerces API_PORT from a string, as it arrives from process.env", () => {
    const result = validateEnv({ ...validEnv, API_PORT: "5000" });
    expect(result.API_PORT).toBe(5000);
  });
});
