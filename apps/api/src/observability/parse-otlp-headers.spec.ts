import { parseOtlpHeaders } from "./parse-otlp-headers";

describe("parseOtlpHeaders", () => {
  it("returns undefined when unset", () => {
    expect(parseOtlpHeaders(undefined)).toBeUndefined();
  });

  it("parses a single key=value pair", () => {
    expect(parseOtlpHeaders("Authorization=Bearer abc")).toEqual({
      Authorization: "Bearer abc",
    });
  });

  it("parses multiple comma-separated pairs", () => {
    expect(parseOtlpHeaders("a=1,b=2")).toEqual({ a: "1", b: "2" });
  });

  it("keeps everything after the first '=' as the value, even if the value itself contains '='", () => {
    expect(parseOtlpHeaders("Authorization=Bearer abc=def==")).toEqual({
      Authorization: "Bearer abc=def==",
    });
  });

  it("trims whitespace around keys and values", () => {
    expect(parseOtlpHeaders(" a = 1 , b = 2 ")).toEqual({ a: "1", b: "2" });
  });
});
