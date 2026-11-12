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
| [`@kit/ui`](packages/ui) | M1 in progress: 5 components + ThemeProvider, 13 tests, Storybook builds |
| `@kit/auth` | planned (M2) |
| `@kit/telemetry` | planned (M3) |

## Measured so far

| Metric | Value | How measured |
|---|---|---|
| `@kit/ui` ESM bundle | 2.4 kB gzip | `gzip -c packages/ui/dist/index.js \| wc -c` (2471 B) |
| `@kit/ui` CSS | 1.3 kB gzip | same on `dist/styles.css` (1297 B) |
| Tests | 13 passing, axe 0 violations in tested states | `pnpm --filter @kit/ui test` |

Performance budgets, Lighthouse and before/after numbers arrive in M5.
