import { trace } from "@opentelemetry/api";

export type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE = /^(authorization|cookie|set-cookie|password|passwd|secret|token|access_?token|refresh_?token|id_?token|api_?key|csrf.*)$/i;

export interface LoggerOptions { service: string; level?: Level; sink?: (line: string, level: Level) => void; now?: () => Date }
export interface Logger { debug(msg: string, f?: Record<string, unknown>): void; info(msg: string, f?: Record<string, unknown>): void; warn(msg: string, f?: Record<string, unknown>): void; error(msg: string, f?: Record<string, unknown>): void; child(f: Record<string, unknown>): Logger }

function sanitize(v: unknown, depth = 0): unknown {
  if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
  if (depth > 4 || v === null || typeof v !== "object") return typeof v === "bigint" ? v.toString() : v;
  if (Array.isArray(v)) return v.map((x) => sanitize(x, depth + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE.test(k) ? "[REDACTED]" : sanitize(x, depth + 1)]));
}

/** One JSON object per line, correlated with the active OpenTelemetry span. Sensitive keys are redacted. */
export function createLogger(o: LoggerOptions, bound: Record<string, unknown> = {}): Logger {
  const min = ORDER[o.level ?? "info"];
  const sink = o.sink ?? ((line, level) => (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line));
  const emit = (level: Level) => (msg: string, f: Record<string, unknown> = {}) => {
    if (ORDER[level] < min) return;
    const ctx = trace.getActiveSpan()?.spanContext();
    const rec = { time: (o.now?.() ?? new Date()).toISOString(), level, service: o.service, msg, ...(ctx && { trace_id: ctx.traceId, span_id: ctx.spanId }), ...(sanitize({ ...bound, ...f }) as object) };
    sink(JSON.stringify(rec), level);
  };
  return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error"), child: (f) => createLogger(o, { ...bound, ...f }) };
}

/** Sink that ships log lines to a collector via sendBeacon/fetch (best effort, never throws). */
export function createRemoteSink(endpoint: string): (line: string) => void {
  return (line) => {
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon?.(endpoint, new Blob([line], { type: "application/json" }))) return;
      void fetch(endpoint, { method: "POST", body: line, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    } catch { /* telemetry must never break the app */ }
  };
}
