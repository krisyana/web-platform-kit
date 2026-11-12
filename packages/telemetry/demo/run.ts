// One command: `pnpm --filter @kit/telemetry demo`. Starts the collector + dashboard and seeds SYNTHETIC events
// so the dashboard has something to show. Real browser data flows in once an app calls initTracing/reportWebVitals (see M6 demo).
import { startCollector } from "../src/collector";

const { url } = await startCollector({ port: 4318 });
const post = (path: string, body: unknown) => fetch(url + path, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const id = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
const seed = async () => {
  const start = BigInt(Date.now()) * 1_000_000n, ms = BigInt(20 + Math.floor(Math.random() * 200)) * 1_000_000n, traceId = id(32);
  await post("/v1/traces", { resourceSpans: [{ resource: { attributes: [{ key: "service.name", value: { stringValue: "synthetic-demo" } }] }, scopeSpans: [{ spans: [{ traceId, spanId: id(16), name: "GET /api/items", startTimeUnixNano: String(start), endTimeUnixNano: String(start + ms), status: { code: Math.random() < 0.2 ? 2 : 1 } }] }] }] });
  await post("/logs", { level: "info", msg: "synthetic request handled", trace_id: traceId });
  await post("/vitals", { name: ["LCP", "CLS", "INP", "TTFB"][Math.floor(Math.random() * 4)], value: Math.random() * 3, rating: "good", url: "/" });
};
await seed();
setInterval(seed, 3000);
console.log(`Dashboard: ${url}  (synthetic data, Ctrl+C to stop)`);
