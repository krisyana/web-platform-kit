"use client";
import type { ReactNode } from "react";
import { createLogger, createRemoteSink, ErrorBoundary, initTracing, reportWebVitals } from "@kit/telemetry";

const isBrowser = typeof window !== "undefined";
export const logger = createLogger({ service: "demo-web", sink: isBrowser ? createRemoteSink("/api/telemetry/logs") : () => {} });

// Initialise once, at module load, not in an effect: child effects run before parent effects, so an effect here
// would miss fetches issued by children on first mount (found by the e2e test).
type G = typeof globalThis & { __kitTelemetryStarted?: boolean };
if (isBrowser && !(globalThis as G).__kitTelemetryStarted) {
  (globalThis as G).__kitTelemetryStarted = true;
  initTracing({ serviceName: "demo-web", endpoint: `${location.origin}/api/telemetry/traces`, batchDelayMs: 1000 });
  reportWebVitals({ endpoint: "/api/telemetry/vitals" });
  logger.info("app started", { path: location.pathname });
}

export function Telemetry({ children }: { children: ReactNode }) {
  return <ErrorBoundary logger={logger} fallback={<p role="alert">Something went wrong. It was reported.</p>}>{children}</ErrorBoundary>;
}
