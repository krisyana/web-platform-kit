# Status

Legend: ✅ verified by the command in the Evidence column | ⏳ planned | ❓ unverified (written but never run)

| Item | State | Evidence |
|---|---|---|
| Docs, ADRs, milestone plan | ✅ | `docs/` |
| pnpm + Turborepo + TS strict scaffold | ✅ | `pnpm run ci` (typecheck, test, build all succeed) |
| `@kit/ui` components (Button, Input, Select, Dialog, Toast, ThemeProvider) | ✅ | `pnpm --filter @kit/ui test`: 13 tests pass |
| axe: 0 violations in tested states (jsdom) | ✅ | same run; colour contrast excluded in jsdom |
| Storybook builds | ✅ | `pnpm --filter @kit/ui build-storybook` exits 0 |
| Storybook a11y addon checks in a real browser | ❓ | configured (`a11y.test: "error"`), the interactive/CI test-runner not run yet |
| Dialog focus trap / Esc in a real browser | ❓ | native `<dialog>` behaviour; Playwright test pending |
| Visual regression (Playwright) | ⏳ | M1 remaining |
| Screen reader manual pass | ❓ | not done |
| GitHub Actions workflow | ❓ | written, never executed (no push without owner OK) |
| `"use client"` preserved in dist | ✅ | `head -c 14 packages/ui/dist/index.js` |
| size-limit / Lighthouse | ⏳ | M5 (sizes above measured by gzip only) |
| `@kit/auth`, `@kit/telemetry`, release tooling, demo app | ⏳ | M2-M6 |
