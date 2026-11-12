import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import { createLogger, createRemoteSink, ErrorBoundary, initTracing, reportWebVitals, withSpan } from "./index";
import { flattenOtlp, startCollector } from "./collector";

vi.mock("web-vitals", () => {
  const mk = (name: string) => (cb: (m: unknown) => void) => cb({ name, value: 1234.5, rating: "good", id: `${name}-1`, delta: 1, navigationType: "navigate" });
  return { onLCP: mk("LCP"), onINP: mk("INP"), onCLS: mk("CLS"), onFCP: mk("FCP"), onTTFB: mk("TTFB") };
});

let tracing: ReturnType<typeof initTracing> | undefined;
// A fresh exporter per test: provider.shutdown() permanently stops the exporter it owns.
let exporter = new InMemorySpanExporter();
beforeEach(() => { exporter = new InMemorySpanExporter(); });
afterEach(async () => { await tracing?.shutdown(); tracing = undefined; vi.restoreAllMocks(); });
const setup = () => (tracing = initTracing({ serviceName: "test-svc", serviceVersion: "1.2.3", exporter, instrumentFetch: false }));

describe("tracing", () => {
  it("requires an endpoint or exporter", () => { expect(() => initTracing({ serviceName: "x" })).toThrow(/endpoint/); });
  it("exports spans with service resource attributes and parent/child nesting", async () => {
    setup();
    await withSpan("outer", async () => { await withSpan("inner", () => 1); });
    const [inner, outer] = exporter.getFinishedSpans();
    expect(outer!.name).toBe("outer"); expect(inner!.name).toBe("inner");
    expect(inner!.spanContext().traceId).toBe(outer!.spanContext().traceId);
    expect(inner!.parentSpanContext?.spanId).toBe(outer!.spanContext().spanId);
    expect(outer!.resource.attributes["service.name"]).toBe("test-svc");
    expect(outer!.resource.attributes["service.version"]).toBe("1.2.3");
  });
  it("records exceptions, sets error status, rethrows and still ends the span", async () => {
    setup();
    await expect(withSpan("boom", () => { throw new Error("nope"); })).rejects.toThrow("nope");
    const s = exporter.getFinishedSpans()[0]!;
    expect(s.status.code).toBe(SpanStatusCode.ERROR); expect(s.events[0]!.name).toBe("exception");
  });
  it("creates client spans for fetch when instrumentation is enabled", async () => {
    const { url, close } = await startCollector();
    tracing = initTracing({ serviceName: "f", exporter, instrumentFetch: true });
    await fetch(`${url}/events`);
    // The instrumentation waits briefly for resource-timing entries before ending the span.
    await vi.waitFor(() => expect(exporter.getFinishedSpans().length).toBeGreaterThan(0), { timeout: 3000 }).catch(() => {});
    const spans = exporter.getFinishedSpans();
    await close();
    expect(spans.some((s) => s.name.includes("GET"))).toBe(true);
    expect(JSON.stringify(spans[0]!.attributes)).toContain("/events");
  });
});

describe("logger", () => {
  const lines: string[] = [];
  const log = createLogger({ service: "svc", sink: (l) => lines.push(l), now: () => new Date("2026-01-01T00:00:00Z") });
  afterEach(() => { lines.length = 0; });
  it("emits one JSON object per call with level, service, time", () => {
    log.info("hello", { a: 1 });
    expect(JSON.parse(lines[0]!)).toEqual({ time: "2026-01-01T00:00:00.000Z", level: "info", service: "svc", msg: "hello", a: 1 });
  });
  it("adds trace_id and span_id of the active span", async () => {
    setup();
    await withSpan("req", (span) => { log.info("inside"); expect(JSON.parse(lines[0]!).trace_id).toBe(span.spanContext().traceId); expect(JSON.parse(lines[0]!).span_id).toBe(span.spanContext().spanId); });
    log.info("outside"); expect(JSON.parse(lines[1]!).trace_id).toBeUndefined();
  });
  it("redacts sensitive keys at any depth and serialises errors", () => {
    log.error("fail", { token: "abc", nested: { Authorization: "Bearer x", ok: 1 }, list: [{ password: "p" }], err: new Error("bad") });
    const rec = JSON.parse(lines[0]!);
    expect(rec.token).toBe("[REDACTED]"); expect(rec.nested.Authorization).toBe("[REDACTED]"); expect(rec.nested.ok).toBe(1); expect(rec.list[0].password).toBe("[REDACTED]");
    expect(rec.err.message).toBe("bad"); expect(JSON.stringify(rec)).not.toContain("Bearer x");
  });
  it("respects the minimum level and child bindings", () => {
    const quiet = createLogger({ service: "s", level: "warn", sink: (l) => lines.push(l) }).child({ req: "r1" });
    quiet.info("skip"); quiet.warn("keep");
    expect(lines).toHaveLength(1); expect(JSON.parse(lines[0]!).req).toBe("r1");
  });
  it("handles bigint and deep objects without throwing", () => {
    log.info("x", { big: 10n, deep: { a: { b: { c: { d: { e: { f: 1 } } } } } } });
    expect(JSON.parse(lines[0]!).big).toBe("10");
  });
  it("default sink routes by level to console", () => {
    const spies = (["log", "warn", "error"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const d = createLogger({ service: "s", level: "debug" }); d.debug("a"); d.warn("b"); d.error("c");
    expect(spies.map((s) => s.mock.calls.length)).toEqual([1, 1, 1]);
  });
  it("remote sink uses sendBeacon, falls back to fetch, and never throws", () => {
    const beacon = vi.fn(() => true); vi.stubGlobal("navigator", { sendBeacon: beacon });
    createRemoteSink("http://x/logs")("{}"); expect(beacon).toHaveBeenCalled();
    const f = vi.fn(() => Promise.resolve(new Response())); vi.stubGlobal("fetch", f); vi.stubGlobal("navigator", { sendBeacon: () => false });
    createRemoteSink("http://x/logs")("{}"); expect(f).toHaveBeenCalled();
    vi.stubGlobal("navigator", { sendBeacon: () => { throw new Error("blocked"); } }); expect(() => createRemoteSink("http://x/logs")("{}")).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("ErrorBoundary", () => {
  const Bomb = () => { throw new Error("render failed"); };
  it("renders the fallback, logs with component stack and records an error span", () => {
    setup(); vi.spyOn(console, "error").mockImplementation(() => {});
    const lines: string[] = []; const logger = createLogger({ service: "ui", sink: (l) => lines.push(l) });
    const onError = vi.fn();
    render(<ErrorBoundary fallback={<p>Something went wrong</p>} logger={logger} onError={onError}><Bomb /></ErrorBoundary>);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    const rec = JSON.parse(lines[0]!);
    expect(rec.level).toBe("error"); expect(rec.error.message).toBe("render failed"); expect(rec.componentStack).toContain("Bomb");
    const span = exporter.getFinishedSpans().find((s) => s.name === "react.error_boundary")!;
    expect(span.status.code).toBe(SpanStatusCode.ERROR); expect(span.events[0]!.name).toBe("exception");
    expect(rec.trace_id).toBe(span.spanContext().traceId); expect(onError).toHaveBeenCalled();
  });
  it("supports a render-prop fallback with reset", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = true; const Maybe = () => { if (fail) throw new Error("x"); return <p>recovered</p>; };
    render(<ErrorBoundary fallback={(e, reset) => <button onClick={() => { fail = false; reset(); }}>{e.message} retry</button>}><Maybe /></ErrorBoundary>);
    screen.getByRole("button", { name: "x retry" }).click();
    expect(await screen.findByText("recovered")).toBeTruthy();
  });
  it("renders children when nothing throws", () => {
    render(<ErrorBoundary fallback={<p>bad</p>}><p>fine</p></ErrorBoundary>);
    expect(screen.getByText("fine")).toBeTruthy();
  });
});

describe("web vitals", () => {
  it("reports all five metrics via sendBeacon with pathname only", () => {
    const sent: { url: string; body: Blob }[] = [];
    vi.stubGlobal("navigator", { sendBeacon: (url: string, body: Blob) => (sent.push({ url, body }), true) });
    const seen: string[] = [];
    expect(reportWebVitals({ endpoint: "http://c/vitals", onReport: (p) => seen.push(p.name) })).toBe(true);
    expect(seen.sort()).toEqual(["CLS", "FCP", "INP", "LCP", "TTFB"]); expect(sent).toHaveLength(5);
    vi.unstubAllGlobals();
  });
  it("falls back to fetch keepalive when beacon is unavailable", () => {
    const f = vi.fn(() => Promise.resolve(new Response())); vi.stubGlobal("fetch", f); vi.stubGlobal("navigator", {});
    reportWebVitals({ endpoint: "http://c/vitals" });
    expect(f).toHaveBeenCalledTimes(5); expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].keepalive).toBe(true);
    vi.unstubAllGlobals();
  });
  it("honours sampling: no reporting when the draw is above sampleRate", () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    expect(reportWebVitals({ endpoint: "http://c", sampleRate: 0.1, random: () => 0.5 })).toBe(false); expect(f).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("collector + OTLP export end to end", () => {
  it("receives spans exported by the real OTLP/HTTP exporter and lists them", async () => {
    const c = await startCollector();
    tracing = initTracing({ serviceName: "e2e-svc", endpoint: `${c.url}/v1/traces` });
    await withSpan("checkout", () => 1);
    await expect(withSpan("failing", () => { throw new Error("e"); })).rejects.toThrow();
    await tracing.forceFlush();
    await vi.waitFor(() => expect(c.events.traces.length).toBe(2), { timeout: 3000 });
    expect(c.events.traces.map((s) => [s.name, s.service, s.status])).toEqual(expect.arrayContaining([["checkout", "e2e-svc", "unset"], ["failing", "e2e-svc", "error"]]));
    await c.close();
  });
  it("accepts logs and vitals, serves the dashboard and caps stored rows", async () => {
    const c = await startCollector({ allowOrigin: "https://app.test" });
    const post = (p: string, b: string) => fetch(c.url + p, { method: "POST", body: b });
    expect((await post("/logs", '{"msg":"<script>alert(1)</script>"}')).status).toBe(200);
    expect((await post("/vitals", '{"name":"LCP"}')).status).toBe(200);
    expect((await post("/nope", "{}")).status).toBe(404);
    expect((await post("/logs", "not json")).status).toBe(400);
    const html = await fetch(c.url + "/");
    const page = await html.text();
    expect(html.headers.get("content-type")).toContain("text/html"); expect(page).not.toContain("alert(1)"); expect(page).not.toContain("innerHTML");
    expect(html.headers.get("access-control-allow-origin")).toBe("https://app.test");
    expect(((await (await fetch(c.url + "/events")).json()) as { logs: unknown[] }).logs).toHaveLength(1);
    expect((await fetch(c.url + "/events", { method: "OPTIONS" })).status).toBe(204);
    expect((await fetch(c.url + "/other")).status).toBe(404);
    expect((await post("/logs", "x".repeat(1_100_000))).status).toBe(413);
    for (let i = 0; i < 510; i++) c.events.logs.push(i);
    await post("/logs", "{}"); expect(c.events.logs.length).toBe(500); // capped at 500 rows
    await c.close();
  });
  it("flattenOtlp tolerates empty and partial payloads", () => {
    expect(flattenOtlp({})).toEqual([]);
    expect(flattenOtlp({ resourceSpans: [{ scopeSpans: [{ spans: [{ traceId: "t", spanId: "s", name: "n", startTimeUnixNano: "1000000", endTimeUnixNano: "3000000", status: { code: 1 }, events: [{ name: "e" }] }] }] }] })).toEqual([{ traceId: "t", spanId: "s", name: "n", service: "unknown", durationMs: 2, status: "ok", events: ["e"] }]);
  });
  it("trace api is globally disabled after shutdown", async () => {
    setup(); await tracing!.shutdown(); tracing = undefined;
    expect(trace.getActiveSpan()).toBeUndefined();
  });
});
