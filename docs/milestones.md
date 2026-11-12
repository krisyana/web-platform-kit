# Milestone plan

Each milestone is done only when **all** acceptance criteria pass and are recorded in [STATUS.md](./STATUS.md).

## M0: Scope and scaffold
- [x] README vision, ADRs 0001-0006, this plan
- [x] pnpm + Turborepo + TypeScript strict; `pnpm build test typecheck` run from root
- [x] CI workflow (`.github/workflows/ci.yml`) running install, typecheck, test, build

## M1: `@kit/ui`
Acceptance:
1. Components: Button, Input, Select, Dialog, Toast, ThemeProvider (light/dark). Each has unit tests incl. keyboard behaviour.
2. `vitest-axe` reports **0 violations** for every component state tested.
3. Storybook builds (`pnpm --filter @kit/ui build-storybook` exits 0) with a story per component and the a11y addon enabled.
4. Visual regression: Playwright screenshot per story in light and dark; CI fails on diff > 0.1% pixels. `[pending until baseline generated in CI]`
5. Keyboard and screen-reader contract documented per component (`packages/ui/docs/a11y.md`).
6. Bundle: ESM entry < 8 kB min+gzip (size-limit), CSS < 6 kB gzip. `[number recorded in M5]`
7. Package exports pass `publint`. `[M4]`

## M2: `@kit/auth` (done 2026-11-12, mock IdP only)
1. Code + PKCE (S256), state, nonce, ID token validation against a mock OIDC provider: happy path e2e test.
2. Tokens never exposed to browser JS: test asserts no token in response bodies, JS-readable cookies, or storage.
3. Cookie attributes asserted: `HttpOnly`, `Secure`, `SameSite`, `__Host-` prefix.
4. CSRF: state-changing request without valid header/origin returns 403 (test).
5. Refresh rotation + reuse detection invalidates session (test); concurrent refresh single-flight (test).
6. XSS test: injected script cannot read session credentials; open-redirect `returnTo` attempts rejected.
7. `THREAT_MODEL.md` (STRIDE table mapped to tests) and CSP/CORS/cookie guide published. Line coverage on `src/` >= 90%.

## M3: `@kit/telemetry` (done 2026-11-12; Web Vitals mocked)
1. OpenTelemetry web tracer provider with fetch instrumentation and OTLP/HTTP exporter; spans verified in a test with an in-memory exporter.
2. Structured logger emits JSON with trace/span correlation ids (test).
3. React `ErrorBoundary` reports error + component stack to logger and span (test).
4. Web Vitals reporter (LCP, INP, CLS, TTFB) sends to a collector endpoint (test with mocked `web-vitals`).
5. Demo collector + dashboard page showing received events; runs with one command.

## M4: Release tooling
1. Changesets configured; CI fails PRs that touch published packages without a changeset.
2. `pnpm changeset version` produces CHANGELOGs; recorded in repo.
3. One deliberate breaking change in `@kit/ui` with: deprecation in minor, removal in major, `docs/migrations/` guide and a jscodeshift codemod with fixture tests.
4. `pnpm release:dry-run` (pack + publint + attw + `npm publish --dry-run`) exits 0. **No real publish without owner approval.**

## M5: Performance budgets
1. size-limit budgets per package fail CI when exceeded (proved by a deliberately failing branch, output recorded).
2. Lighthouse CI on the demo app: performance >= 0.9, accessibility >= 0.95 (assertions in `lighthouserc.json`).
3. Web Vitals thresholds (LCP <= 2.5 s, CLS <= 0.1, INP proxy via TBT <= 200 ms) asserted in LHCI.
4. README holds before/after numbers with the commit hashes that produced them.

## M6: Demo app
1. Next.js App Router app consumes `@kit/ui`, `@kit/auth` (BFF routes) and `@kit/telemetry`.
2. Playwright e2e: login against mock OIDC, protected route, refresh, logout.
3. `wrangler deploy --dry-run` succeeds (OpenNext for Cloudflare or equivalent). `[UNVERIFIED]` toolchain choice. **Deploy only with owner approval.**
4. Lighthouse and size budgets (M5) green on the built app.
