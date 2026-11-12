import { SpanStatusCode, trace, type Span, type Tracer } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, SimpleSpanProcessor, type SpanExporter } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  /** OTLP/HTTP traces endpoint, e.g. https://collector.example.com/v1/traces */
  endpoint?: string;
  /** Custom exporter (tests). Exports synchronously per span instead of batching. */
  exporter?: SpanExporter;
  /** Origins that may receive `traceparent` headers on fetch (CORS must allow the header). Default: same origin only. */
  propagateTo?: (string | RegExp)[];
  /** Batch export delay in ms (default 5000). */
  batchDelayMs?: number;
  /** Patch `fetch` to create client spans. Default true. */
  instrumentFetch?: boolean;
}

export interface Tracing { provider: WebTracerProvider; tracer: Tracer; forceFlush(): Promise<void>; shutdown(): Promise<void> }

export function initTracing(o: TracingOptions): Tracing {
  if (!o.endpoint && !o.exporter) throw new Error("initTracing needs `endpoint` or `exporter`");
  const processor = o.exporter ? new SimpleSpanProcessor(o.exporter) : new BatchSpanProcessor(new OTLPTraceExporter({ url: o.endpoint! }), { scheduledDelayMillis: o.batchDelayMs ?? 5000 });
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({ "service.name": o.serviceName, ...(o.serviceVersion && { "service.version": o.serviceVersion }) }),
    spanProcessors: [processor],
  });
  provider.register();
  const unregister = o.instrumentFetch === false ? () => {} : registerInstrumentations({
    instrumentations: [new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: o.propagateTo ?? [],
      ignoreUrls: o.endpoint ? [o.endpoint] : [], // never trace the exporter's own traffic
    })],
  });
  return {
    provider,
    tracer: trace.getTracer(o.serviceName, o.serviceVersion),
    forceFlush: () => provider.forceFlush(),
    shutdown: async () => { unregister(); await provider.shutdown(); trace.disable(); },
  };
}

/** Runs `fn` inside an active span; records exceptions and always ends the span. */
export async function withSpan<T>(name: string, fn: (span: Span) => Promise<T> | T, tracer: Tracer = trace.getTracer("@kit/telemetry")): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try { return await fn(span); }
    catch (e) { span.recordException(e as Error); span.setStatus({ code: SpanStatusCode.ERROR, message: (e as Error).message }); throw e; }
    finally { span.end(); }
  });
}
