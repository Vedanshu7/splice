/** Parses the OTLP-standard `key1=value1,key2=value2` header env var format used by every OTel exporter. */
export function parseOtlpHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const entries = raw.split(",").map((pair) => {
    const [key, ...rest] = pair.split("=");
    return [key.trim(), rest.join("=").trim()] as const;
  });
  return Object.fromEntries(entries);
}
