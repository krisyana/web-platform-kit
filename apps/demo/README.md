# @kit/demo

Next.js 16 (App Router) app that consumes `@kit/ui`, `@kit/auth` and `@kit/telemetry`.

```bash
pnpm install && pnpm run build         # builds the packages
pnpm --filter @kit/demo idp            # mock OIDC provider on :4010 (auto-approves; test use only)
pnpm --filter @kit/demo dev            # http://localhost:3000
pnpm --filter @kit/demo test           # Playwright e2e (needs `pnpm build` first; starts idp + next start)
pnpm --filter @kit/demo perf           # build, size-limit, Lighthouse CI (set CHROME_PATH)
```

## What it demonstrates
- `src/proxy.ts`: per-request nonce CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`, no `unsafe-inline`). The e2e test asserts the header and zero console errors. This is why the layout renders dynamically.
- `src/app/api/auth/[...route]/route.ts`: the `@kit/auth` BFF. `/account` is a server component reading the session cookie.
- `src/components/Telemetry.tsx`: tracing + logs + Web Vitals to same-origin `/api/telemetry/*`, shown on `/telemetry`. Initialised at module load (an effect missed first-mount fetches; found by the e2e test).

## Cloudflare
```bash
pnpm --filter @kit/demo cf:dry-run   # OpenNext build + `wrangler deploy --dry-run`; uploads nothing
```
Verified: the dry run succeeds (worker bundle + 18 assets, 5.9 MiB / 1.25 MiB gzip).
**Not verified / known gaps:**
- Never run in `workerd` or deployed. **Deploying needs the owner's explicit OK.**
- OpenNext prints: Node.js middleware (`proxy.ts`) is experimental on Cloudflare. The CSP may not behave there until tested **[UNVERIFIED]**.
- `MemorySessionStore` and the telemetry store are per-isolate memory: sessions would not survive across isolates. Production needs a KV/Durable Object `SessionStore` (not written).
- `wrangler.jsonc` vars point at placeholder hosts (`example.workers.dev`, `idp.example.com`).
