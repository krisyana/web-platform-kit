import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface CollectorEvents { traces: SpanRow[]; logs: unknown[]; vitals: unknown[] }
export interface SpanRow { traceId: string; spanId: string; name: string; service: string; durationMs: number; status: "ok" | "error" | "unset"; events: string[] }
interface OtlpAttr { key: string; value: { stringValue?: string } }
interface OtlpSpan { traceId: string; spanId: string; name: string; startTimeUnixNano: string; endTimeUnixNano: string; status?: { code?: number }; events?: { name: string }[] }

const MAX_BODY = 1_000_000, MAX_ROWS = 500;

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

const readBody = (req: IncomingMessage) => new Promise<string>((resolve, reject) => {
  let size = 0; const chunks: Buffer[] = [];
  // Keep draining an oversized body (without storing it) so the client gets a clean 413 instead of a reset.
  req.on("data", (c: Buffer) => { size += c.length; if (size <= MAX_BODY) chunks.push(c); });
  req.on("end", () => (size > MAX_BODY ? reject(new Error("too large")) : resolve(Buffer.concat(chunks).toString("utf8"))));
  req.on("error", reject);
});

/** Demo collector: OTLP/HTTP JSON traces, JSON logs and web-vitals, plus a dashboard at `/`. In-memory, unauthenticated: local demo use only. */
export async function startCollector(opts: { port?: number; allowOrigin?: string } = {}) {
  const events: CollectorEvents = { traces: [], logs: [], vitals: [] };
  const push = <T>(arr: T[], items: T[]) => { arr.push(...items); if (arr.length > MAX_ROWS) arr.splice(0, arr.length - MAX_ROWS); };
  const cors = { "access-control-allow-origin": opts.allowOrigin ?? "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "GET, POST, OPTIONS" };
  const reply = (res: ServerResponse, status: number, body: string, type = "application/json") => { res.writeHead(status, { ...cors, "content-type": type, "x-content-type-options": "nosniff", "cache-control": "no-store" }); res.end(body); };

  const server: Server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://x").pathname;
      if (req.method === "OPTIONS") return reply(res, 204, "");
      if (req.method === "GET" && path === "/") return reply(res, 200, DASHBOARD, "text/html; charset=utf-8");
      if (req.method === "GET" && path === "/events") return reply(res, 200, JSON.stringify(events));
      if (req.method === "POST") {
        const body = JSON.parse((await readBody(req)) || "{}");
        if (path === "/v1/traces") push(events.traces, flattenOtlp(body));
        else if (path === "/logs") push(events.logs, [body]);
        else if (path === "/vitals") push(events.vitals, [body]);
        else return reply(res, 404, '{"error":"not found"}');
        return reply(res, 200, "{}");
      }
      reply(res, 404, '{"error":"not found"}');
    } catch (e) {
      reply(res, (e as Error).message === "too large" ? 413 : 400, '{"error":"bad request"}');
    }
  });
  await new Promise<void>((r) => server.listen(opts.port ?? 0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, events, close: () => new Promise<void>((r) => { server.closeAllConnections(); server.close(() => r()); }) };
}

// Dashboard renders everything with textContent: no innerHTML, so hostile log content cannot execute.
const DASHBOARD = `<!doctype html><meta charset="utf-8"><title>Telemetry demo</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font:14px system-ui;margin:2rem;color:#14171f}table{border-collapse:collapse;width:100%;margin-bottom:2rem}td,th{border-bottom:1px solid #ccc;padding:.4rem;text-align:left}h2{margin-top:2rem}.error{color:#b42318}code{font-size:12px}</style>
<h1>Telemetry demo dashboard</h1><p id="n"></p>
<h2>Web Vitals</h2><table id="vitals"></table><h2>Traces</h2><table id="traces"></table><h2>Logs</h2><table id="logs"></table>
<script>
const cell=(t,c)=>{const e=document.createElement("td");e.textContent=String(t);if(c)e.className=c;return e};
function fill(id,head,rows){const t=document.getElementById(id);t.replaceChildren();const h=document.createElement("tr");head.forEach(x=>{const e=document.createElement("th");e.textContent=x;h.append(e)});t.append(h);rows.slice(-50).reverse().forEach(r=>{const tr=document.createElement("tr");r.forEach(c=>tr.append(c));t.append(tr)})}
async function tick(){const d=await (await fetch("/events")).json();
document.getElementById("n").textContent=d.traces.length+" spans, "+d.logs.length+" logs, "+d.vitals.length+" vitals";
fill("vitals",["metric","value","rating","path"],d.vitals.map(v=>[cell(v.name),cell(Math.round(v.value*1000)/1000),cell(v.rating),cell(v.url)]));
fill("traces",["span","service","ms","status","trace"],d.traces.map(s=>[cell(s.name),cell(s.service),cell(s.durationMs.toFixed(1)),cell(s.status,s.status==="error"?"error":""),cell(s.traceId.slice(0,8))]));
fill("logs",["level","message","trace"],d.logs.map(l=>[cell(l.level,l.level==="error"?"error":""),cell(l.msg),cell((l.trace_id||"").slice(0,8))]));}
tick();setInterval(tick,2000);
</script>`;
