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
