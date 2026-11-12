# Web Platform Kit

A reference web platform in one monorepo: design system, secure auth, telemetry, release tooling and performance budgets.
Read the [vision](docs/README.md), the [ADRs](docs/adr) and the [milestone plan](docs/milestones.md).

> Rule of this repo: every claim is backed by a command or a number. Unverified items are marked **[UNVERIFIED]**. See [STATUS](docs/STATUS.md).

## Quick start

```bash
pnpm install
pnpm run ci                                # typecheck + test + build via Turborepo
pnpm --filter @kit/ui build && pnpm --filter @kit/ui storybook
```

Requires Node >= 20 and pnpm. Developed on Node 26 / pnpm 12.

## Packages

| Package | State |
|---|---|
| [`@kit/ui`](packages/ui) | M1 nearly done (now v0.3.0 after a deprecation + codemod demo, see [RELEASING](docs/RELEASING.md)): 5 components + ThemeProvider, 13 unit tests, 23 browser tests (axe, keyboard, visual), size budget |
| [`@kit/auth`](packages/auth) | M2 done against a mock IdP: BFF, 42 tests, threat model, CSP/CORS/cookie guide |
| [`apps/demo`](apps/demo) | Next.js demo using all three packages: nonce CSP, OIDC login, telemetry; 4 e2e tests; Cloudflare dry run |
| [`@kit/telemetry`](packages/telemetry) | M3 done: tracing, logger, error boundary, Web Vitals, demo collector (21 tests) |

## Measured so far

| Metric | Value | How measured |
|---|---|---|
| `@kit/ui` JS (minified, gzip, size-limit) | 2.05 kB (budget 4 kB) | `pnpm --filter @kit/ui size` |
| `@kit/ui` CSS (gzip) | 1288 B (budget 3 kB) | same command |
| Browser tests | 23 pass (axe incl. contrast, dialog keyboard, toasts, theme, 10 visual) | `pnpm --filter @kit/ui test:e2e` |
| Tests | 13 passing, axe 0 violations in tested states | `pnpm --filter @kit/ui test` |

Performance budgets, Lighthouse and before/after numbers arrive in M5.

## Performance (lab, local, median of 3 Lighthouse runs; details and caveats in [docs/perf](docs/perf/README.md))

| | Baseline | Deliberate regression (gate fails) |
|---|---|---|
| Demo client JS gzip | 208 kB (budget 230 kB) | 660 kB: `size-limit` fails |
| Lighthouse performance | 1.00 | 0.71: `lhci` fails |
| LCP / TBT / CLS | 755 ms / 4 ms / 0.007 | 756 ms / 3488 ms / 0.007 |

## Release
Changesets + Changeset-gated CI, a deprecation lifecycle with codemod ([RELEASING](docs/RELEASING.md)), `pnpm release:dry-run`. Nothing is published, pushed or deployed.
