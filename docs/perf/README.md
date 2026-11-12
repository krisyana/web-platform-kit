# Performance budgets

Budgets live in config and fail the build:

| Budget | Where | Threshold |
|---|---|---|
| `@kit/ui` JS (min+gzip, react external) | `packages/ui/package.json` `size-limit` | 4 kB |
| `@kit/ui` CSS (gzip) | `packages/ui/scripts/check-css-size.mjs` | 3 kB |
| Demo app client JS (all chunks, gzip) | `apps/demo/package.json` `size-limit` | 230 kB |
| Lighthouse performance / accessibility / best-practices | `apps/demo/lighthouserc.json` | >= 0.90 / 0.95 / 0.90 |
| LCP | same | <= 2500 ms |
| CLS | same | <= 0.1 |
| TBT (lab proxy for INP; INP itself is not measurable in a lab run) | same | <= 200 ms |

Run: `cd apps/demo && pnpm perf` (build, size-limit, Lighthouse CI x3, set `CHROME_PATH` locally). Summary: `node scripts/perf-summary.mjs` (median of runs).

## Measured numbers (2026-11-12, MacBook, local `next start`, Lighthouse 13.6.0 mobile emulation + simulated throttling, median of 3 runs)

| Metric | Baseline | Deliberate regression | After revert |
|---|---|---|---|
| Client JS gzip (size-limit) | 207.95 kB | **660.35 kB** (limit 230 kB: FAILED) | 207.95 kB |
| Lighthouse performance | 1.00 | **0.71** (FAILED) | 1.00 |
| LCP | 755 ms | 756 ms | 755 ms |
| TBT | 4 ms | **3488 ms** (FAILED) | 3 ms |
| CLS | 0.0068 | 0.0068 | 0.0068 |
| Accessibility / best practices | 1.00 / 0.96 | 1.00 / 0.96 | 1.00 / 0.96 |

The "regression" was a throwaway component (450 kB random string + 900 ms main-thread loop on mount), never committed. Both `pnpm size` and `pnpm lhci` exited 1 on it and exited 0 after reverting. This proves the gates fail on regressions, as opposed to a before/after of a real optimisation: the demo app was not slow to begin with.

## Caveats (read before quoting these numbers)
- Local server, no real network, one machine: absolute values will differ in CI and in the field. Relative gates matter more than the absolutes.
- Lab data only. Field Web Vitals from real users are collected by `@kit/telemetry` but there is no production traffic.
- LCP equals FCP because the page is a heading. A heavier page needs fresh budgets.
- The CI job runs the same commands; its first result is **[UNVERIFIED]** until the workflow runs.
