# Status

Legend: ✅ verified by the command in the Evidence column | ⏳ planned | ❓ unverified (written but never run)

| Item | State | Evidence |
|---|---|---|
| Docs, ADRs, milestone plan | ✅ | `docs/` |
| pnpm + Turborepo + TS strict scaffold | ✅ | `pnpm run ci` (typecheck, test, build all succeed) |
| `@kit/ui` components (Button, Input, Select, Dialog, Toast, ThemeProvider) | ✅ | `pnpm --filter @kit/ui test`: 13 tests pass |
| axe: 0 violations in tested states (jsdom) | ✅ | same run; colour contrast excluded in jsdom |
| Storybook builds | ✅ | `pnpm --filter @kit/ui build-storybook` exits 0 |
| axe in real Chromium incl. colour contrast, 5 stories x light/dark | ✅ | `pnpm --filter @kit/ui test:e2e` (23 tests, passed 4 consecutive runs after fixing a theme-timing race) |
| Dialog focus stays in dialog, Esc closes, focus returns to opener (Chromium) | ✅ | e2e `dialog:` test. Firefox/WebKit not run ❓ |
| Visual regression (Playwright), darwin baselines | ✅ | 10 screenshots in `packages/ui/e2e/__screenshots__/darwin`; diff-fails path not demonstrated ❓ |
| Visual regression on Linux/CI | ❓ | no Linux baselines yet; CI skips `@visual` |
| Screen reader manual pass | ❓ | not done |
| GitHub Actions workflow | ❓ | written, never executed (no push without owner OK) |
| `"use client"` preserved in dist | ✅ | `head -c 14 packages/ui/dist/index.js` |
| size-limit budget for `@kit/ui` (4 kB JS, 3 kB CSS gzip) | ✅ | `pnpm --filter @kit/ui size`: 2.05 kB JS, 1288 B CSS. Failure path not demonstrated ❓ |
| Lighthouse / Web Vitals gates | ⏳ | M5 |
| `@kit/auth`, `@kit/telemetry`, release tooling, demo app | ⏳ | M2-M6 |
| `@kit/auth` BFF: code+PKCE, nonce/state, ID token checks, session cookies, CSRF, refresh rotation + single-flight, reuse revocation | ✅ | `pnpm --filter @kit/auth test`: 42 tests, 100% lines / 91% branches |
| `@kit/auth` negative-test sensitivity | ✅ | manually disabled CSRF check and tx check: 2 tests failed each (not automated) |
| `@kit/auth` against a real IdP (Keycloak/Auth0/Google) | ❓ | only the mock IdP |
| `@kit/auth` production session store, RP-initiated logout, rate limiting | ⏳ | not implemented; listed in threat model |
| CSP guidance | ❓ | written, to be proven in M6 demo |
| `@kit/telemetry`: tracing (OTLP export e2e, fetch spans), JSON logger with trace ids + redaction, ErrorBoundary, Web Vitals reporter, demo collector | ✅ | `pnpm --filter @kit/telemetry test`: 21 tests, 100% lines / 94% branches |
| Demo dashboard renders | ✅ | `pnpm --filter @kit/telemetry demo` + headless Chromium load: rows rendered, 0 page errors (manual, synthetic data) |
| Real Web Vitals values, real OTel collector, async context propagation in browsers | ❓ | mocked / not tested; see package README |
| Changesets: two sequential releases of `@kit/ui` (0.2.0 deprecation, 0.3.0 removal) with CHANGELOG | ✅ | `packages/ui/CHANGELOG.md`, `.changeset/config.json` |
| Codemod `button-loading-to-busy` | ✅ | 6 fixture tests + jscodeshift CLI run on a sample file |
| Migration guide + RELEASING doc | ✅ | `docs/migrations/ui-0.2-to-0.3.md`, `docs/RELEASING.md` |
| Publish dry run (publint --strict, attw node16, `pnpm publish --dry-run`) for all 3 packages | ✅ | `pnpm release:dry-run` exits 0; nothing published. node10 resolution of subpath exports is ignored by design |
| CI changeset-required check on PRs | ❓ | in workflow, never executed |
| npm provenance / real publish | ❓ | not done; needs owner approval, public repo and `@kit` npm scope |
| Demo app (Next.js 16 App Router) consuming ui + auth + telemetry, nonce CSP via proxy | ✅ | `pnpm --filter @kit/demo test`: 4 Playwright tests (CSP header + zero console errors, axe, full OIDC login against mock IdP with HttpOnly cookie and 403 on CSRF, telemetry arrives) |
| Perf budgets: size-limit (ui, demo), Lighthouse CI assertions | ✅ | `pnpm lhci` exit 0 on baseline; exit 1 on a deliberate regression (see docs/perf/README.md) |
| Before/after numbers | ✅ (lab, local) | docs/perf/README.md; baseline LCP 755 ms, TBT 4 ms, JS 208 kB gz |
| Field Web Vitals / CI-hosted Lighthouse numbers | ❓ | none yet |
