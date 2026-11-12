# ADR 0003: Test strategy

- Status: Accepted
- Date: 2026-11-12

## Decision
A pyramid with explicit ownership per layer:

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Unit / component | Vitest + Testing Library + `user-event`, jsdom | behaviour, keyboard, ARIA roles | every PR |
| Accessibility (automated) | `vitest-axe` (axe-core) in unit tests; `@storybook/addon-a11y` | every component state with zero violations | every PR |
| Visual regression | Playwright screenshots against Storybook | token or style regressions per component, light and dark | every PR (Linux baseline in CI) |
| Security | Vitest against a local mock OIDC provider | XSS, CSRF, token leakage (M2) | every PR |
| End to end | Playwright against the demo app | login, refresh, telemetry (M6) | main + PR |
| Performance | size-limit, Lighthouse CI | budgets (M5) | every PR |

## Rules
- Test behaviour a user or consumer can observe (roles, labels, emitted network calls), not implementation.
- Automated axe catches only a fraction of WCAG issues. Keyboard and screen-reader behaviour is therefore
  *also* documented per component and asserted with keyboard tests. Manual screen reader passes are marked
  `[UNVERIFIED]` until someone records them in `docs/a11y/`.
- Visual baselines are generated in CI (Linux, pinned Playwright image) to avoid cross-OS font drift.
  Local macOS runs use a separate snapshot path suffix and are not committed.
- Coverage is reported, not worshipped: thresholds guard the security-critical package (`@kit/auth`).

## Consequences
Multiple tools, but each has one job and one CI step. Flaky visual tests are fixed (animations disabled, fonts pinned), not retried blindly.
