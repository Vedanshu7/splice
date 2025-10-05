describe("env", () => {
  const validEnv = {
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    NEXT_PUBLIC_API_URL: "http://localhost:4000",
  };
  const keys = Object.keys(validEnv) as (keyof typeof validEnv)[];
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) savedEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  function loadEnvWith(vars: Partial<Record<keyof typeof validEnv, string>>) {
    let result: unknown;
    jest.isolateModules(() => {
      for (const key of keys) delete process.env[key];
      Object.assign(process.env, vars);
      // eslint-disable-next-line @typescript-eslint/no-var-requires -- jest.isolateModules needs a synchronous require to get a fresh module instance per call
      result = require("./env").env;
    });
    return result;
  }

  it("passes through valid public env vars unchanged", () => {
    expect(loadEnvWith(validEnv)).toEqual({
      ...validEnv,
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    });
  });

  it("throws if NEXT_PUBLIC_SUPABASE_URL isn't a valid URL", () => {
    expect(() =>
      loadEnvWith({ ...validEnv, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }),
    ).toThrow();
  });

  it("throws if a required var is missing", () => {
    const { NEXT_PUBLIC_API_URL: _omit, ...rest } = validEnv;
    expect(() => loadEnvWith(rest)).toThrow();
  });
});
