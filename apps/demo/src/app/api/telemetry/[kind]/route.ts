import { flattenOtlp } from "@kit/telemetry/otlp";
import { MAX_ROWS, store } from "@/lib/telemetry-store";

export const dynamic = "force-dynamic";
const cap = <T,>(a: T[]) => { if (a.length > MAX_ROWS) a.splice(0, a.length - MAX_ROWS); };

export async function POST(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const text = await req.text();
  if (text.length > 100_000) return new Response(null, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  if (kind === "traces") store.traces.push(...flattenOtlp(body as never));
  else if (kind === "logs") store.logs.push(body as Record<string, unknown>);
  else if (kind === "vitals") store.vitals.push(body as Record<string, unknown>);
  else return new Response(null, { status: 404 });
  cap(store.traces); cap(store.logs); cap(store.vitals);
  return new Response(null, { status: 204 });
}
