# @kit/telemetry

OpenTelemetry web tracing, structured logs with trace correlation, a React error boundary and a Web Vitals reporter.

```ts
import { initTracing, createLogger, createRemoteSink, ErrorBoundary, reportWebVitals, withSpan } from "@kit/telemetry";

const tracing = initTracing({ serviceName: "web", endpoint: "https://collector.example.com/v1/traces" });
const log = createLogger({ service: "web", sink: createRemoteSink("https://collector.example.com/logs") });
reportWebVitals({ endpoint: "https://collector.example.com/vitals", sampleRate: 0.25 });

<ErrorBoundary logger={log} fallback={<p>Something went wrong</p>}><App /></ErrorBoundary>;
await withSpan("checkout", async () => { log.info("started"); /* log carries trace_id and span_id */ });
```

| Feature | Behaviour | Test |
|---|---|---|
| Tracing | Web tracer provider, OTLP/HTTP batch export, service resource attrs, fetch client spans. `traceparent` is only sent to origins in `propagateTo` (default none), and the exporter's own requests are ignored | "exports spans…", "creates client spans for fetch", real-exporter e2e against the collector |
| Logging | One JSON line per call; `trace_id`/`span_id` of the active span; keys such as `token`, `password`, `authorization`, `cookie`, `csrf*` are replaced by `[REDACTED]` at any depth | logger suite |
| Error boundary | Fallback UI (node or render-prop with reset); logs error + component stack; records an error span with an `exception` event | ErrorBoundary suite |
| Web Vitals | LCP, INP, CLS, FCP, TTFB via `web-vitals`; `sendBeacon` with `fetch keepalive` fallback; sampling decided once per load; reports the pathname only (no query string) | vitals suite (web-vitals is mocked) |

## Demo collector and dashboard
```bash
pnpm --filter @kit/telemetry demo   # http://127.0.0.1:4318
```
Starts `@kit/telemetry/collector` (OTLP/HTTP JSON traces, `/logs`, `/vitals`) and **seeds synthetic events** so the dashboard is not empty.
Real data arrives when an app uses the APIs above (the M6 demo app). The collector is in-memory, unauthenticated, CORS `*` by default: local demo only.
The dashboard builds the DOM with `textContent` (no `innerHTML`), covered by a test that posts `<script>` content.

## Verified vs not
- Verified: 21 tests; 100% lines, ~94% branches (`pnpm --filter @kit/telemetry test`). Dashboard rendered in headless Chromium with no page errors (manual script, not committed).
- Not verified: real `web-vitals` measurements in a browser (mocked in tests), a real OTel collector (only the demo collector), browsers other than Chromium, context propagation across `await` in browsers (uses `StackContextManager`, which does not follow async boundaries; use `withSpan` per async unit or add zone.js) **[UNVERIFIED]**.
- Privacy: logs may contain PII you pass in; redaction is key-name based only.
