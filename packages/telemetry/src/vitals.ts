import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

export interface VitalsOptions {
  endpoint: string;
  /** 0..1 fraction of page loads that report. Decided once per page load. Default 1. */
  sampleRate?: number;
  onReport?: (payload: VitalsPayload) => void;
  random?: () => number;
}
export interface VitalsPayload { name: string; value: number; rating: string; id: string; delta: number; navigationType: string; url: string; ts: number }

export function toPayload(m: Metric): VitalsPayload {
  return { name: m.name, value: m.value, rating: m.rating, id: m.id, delta: m.delta, navigationType: m.navigationType, url: location.pathname, ts: Date.now() };
}

/** Reports LCP, INP, CLS, FCP and TTFB. `url` is the pathname only (no query string, which may contain PII). */
export function reportWebVitals(o: VitalsOptions): boolean {
  if ((o.random ?? Math.random)() >= (o.sampleRate ?? 1)) return false;
  const send = (m: Metric) => {
    const payload = toPayload(m);
    o.onReport?.(payload);
    const body = JSON.stringify(payload);
    try {
      if (!navigator.sendBeacon?.(o.endpoint, new Blob([body], { type: "application/json" }))) throw new Error("beacon refused");
    } catch {
      void fetch(o.endpoint, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    }
  };
  for (const on of [onLCP, onINP, onCLS, onFCP, onTTFB]) on(send);
  return true;
}
