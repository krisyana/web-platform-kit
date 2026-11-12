import { store } from "@/lib/telemetry-store";

export default function TelemetryPage() {
  return (
    <>
      <h1>Collected telemetry</h1>
      <p data-testid="counts">{store.traces.length} spans, {store.logs.length} logs, {store.vitals.length} vitals</p>
      <h2>Web Vitals</h2>
      <ul>{store.vitals.slice(-20).map((v, i) => <li key={i}>{String(v.name)}: {Number(v.value).toFixed(2)} ({String(v.rating)})</li>)}</ul>
      <h2>Spans</h2>
      <ul>{store.traces.slice(-20).map((s) => <li key={s.spanId}>{s.name} ({s.durationMs.toFixed(0)} ms, {s.status})</li>)}</ul>
      <h2>Logs</h2>
      <ul>{store.logs.slice(-20).map((l, i) => <li key={i}>{String(l.level)}: {String(l.msg)}</li>)}</ul>
    </>
  );
}
