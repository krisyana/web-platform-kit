import type { SpanRow } from "@kit/telemetry/otlp";

export interface Store { traces: SpanRow[]; logs: Record<string, unknown>[]; vitals: Record<string, unknown>[] }
type G = typeof globalThis & { __kitTelemetry?: Store };
/** In-memory demo store (per server process). Not durable. */
export const store: Store = ((globalThis as G).__kitTelemetry ??= { traces: [], logs: [], vitals: [] });
export const MAX_ROWS = 200;
