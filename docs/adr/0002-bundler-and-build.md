# ADR 0002: Bundler and build

- Status: Accepted
- Date: 2026-11-12

## Context
Libraries must ship ESM (and CJS where useful), type declarations, tree-shakeable output, and
CSS that does not require a runtime style injector (CSP: `style-src` without `'unsafe-inline'`).

## Options
| Option | Notes |
|---|---|
| **tsup (esbuild)** | One config, ESM+CJS, `.d.ts` via the TypeScript API, `"use client"` banner support |
| Vite library mode | Great for apps, more config for multi-entry libs and dts |
| tsc only | Correct types but no bundling or minification, no CJS |
| Rollup | Maximum control, most config |

## Decision
- Libraries (`@kit/*`): **tsup**, formats `esm` + `cjs`, `dts: true`, `treeshake`, `sideEffects` declared per package (`["*.css"]`).
- `@kit/ui` CSS is plain CSS files built from design tokens (CSS custom properties), copied to `dist/` and
  imported explicitly by consumers (`@kit/ui/styles.css`). No CSS-in-JS runtime.
- Apps: framework build (Next.js). Storybook uses Vite (its default builder).
- Packages declare `exports` with `types`, `import`, `require` conditions; `publint`/`attw` checks are part of release CI (M4).

## Consequences
- Fast builds; no style injection, so strict CSP is possible.
- Because `tsup` only transpiles, `tsc --noEmit` runs as a separate `typecheck` task.
- If tsup maintenance stalls, migrate to `tsdown`/Rollup; build config is isolated per package.
