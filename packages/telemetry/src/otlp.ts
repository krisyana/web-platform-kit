/** Pure OTLP/HTTP JSON helpers (no Node APIs, safe for Workers and Next.js route handlers). */
export interface SpanRow { traceId: string; spanId: string; name: string; service: string; durationMs: number; status: "ok" | "error" | "unset"; events: string[] }
interface OtlpAttr { key: string; value: { stringValue?: string } }
interface OtlpSpan { traceId: string; spanId: string; name: string; startTimeUnixNano: string; endTimeUnixNano: string; status?: { code?: number }; events?: { name: string }[] }


export function flattenOtlp(body: { resourceSpans?: { resource?: { attributes?: OtlpAttr[] }; scopeSpans?: { spans?: OtlpSpan[] }[] }[] }): SpanRow[] {
  const rows: SpanRow[] = [];
  for (const rs of body.resourceSpans ?? []) {
    const service = rs.resource?.attributes?.find((a) => a.key === "service.name")?.value.stringValue ?? "unknown";
    for (const ss of rs.scopeSpans ?? []) for (const s of ss.spans ?? []) {
      rows.push({ traceId: s.traceId, spanId: s.spanId, name: s.name, service, durationMs: Number((BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1000n) / 1000, status: s.status?.code === 2 ? "error" : s.status?.code === 1 ? "ok" : "unset", events: (s.events ?? []).map((e) => e.name) });
    }
  }
  return rows;
}
