# Web Platform Kit: vision

A small, honest reference implementation of what a **web platform team** ships to product teams:
a design system, a secure auth client, telemetry, a release pipeline, and performance guardrails,
all in one monorepo, all enforced by CI.

It is a portfolio project. The goal is not feature breadth. The goal is to show the *platform* concerns
that app-level projects hide: API stability and semver, accessibility as a gate, security by construction,
observability, and budgets that fail the build.

## Principles

1. **Every claim is runnable or measured.** Docs link to a test, a script or a recorded number.
   Anything not yet verified is tagged `[UNVERIFIED]` and listed in [`STATUS.md`](./STATUS.md).
2. **Safe by default.** Tokens never reach JS (BFF + HttpOnly cookies), CSP-friendly output (no inline styles or scripts required), accessible components out of the box.
3. **Small public API, strict semver.** Breaking changes ship with a changeset, a migration guide and (where possible) a codemod.
4. **Boring tooling.** pnpm, Turborepo, TypeScript strict, Vitest, Playwright, Changesets. See the ADRs.
5. **Budgets over opinions.** Bundle size, Lighthouse and Web Vitals thresholds live in config files and fail CI.

## Packages

| Package | Purpose | Plan |
|---|---|---|
| `@kit/ui` | Accessible, token-driven React components, light/dark theming | M1 |
| `@kit/auth` | OIDC auth-code + PKCE via backend-for-frontend, CSRF, refresh rotation | M2 |
| `@kit/telemetry` | OpenTelemetry web tracing, structured logs, error boundary, Web Vitals | M3 |
| release tooling | Changesets, changelogs, migration guide, codemod, publish dry-run | M4 |
| perf budgets | size-limit, Lighthouse CI, Web Vitals gates | M5 |
| `apps/demo` | Next.js App Router app consuming all packages, deployable to Cloudflare | M6 |

## Documents

- [Milestone plan with acceptance criteria](./milestones.md)
- [STATUS.md](./STATUS.md): what is verified and what is not (updated each milestone)
- ADRs
  - [0001 Monorepo tooling](./adr/0001-monorepo-tooling.md)
  - [0002 Bundler and build](./adr/0002-bundler-and-build.md)
  - [0003 Test strategy](./adr/0003-test-strategy.md)
  - [0004 Versioning and release](./adr/0004-versioning-and-release.md)
  - [0005 Auth design](./adr/0005-auth-design.md)
  - [0006 Component and styling approach](./adr/0006-component-and-styling.md)

## Non-goals

- Not a full design system (a handful of components, done well).
- Not an identity provider. `@kit/auth` is a *client-side platform layer*; tests use a local mock OIDC provider.
- No real npm publish, push or deploy without explicit owner approval.
