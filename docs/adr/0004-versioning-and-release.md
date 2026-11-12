# ADR 0004: Versioning and release

- Status: Accepted
- Date: 2026-11-12

## Decision
- **Changesets** drive versioning and changelogs. Every PR that changes a published package adds a changeset (CI check).
- **Independent versioning** per package (`@kit/ui`, `@kit/auth`, `@kit/telemetry`) following semver.
  The demo app is private and unversioned.
- Pre-1.0 policy: during `0.x`, minor = may break, patch = fixes. First stable release is `1.0.0` after M6.
- Public API = what is exported from the package entry point and documented. Everything else is internal.
- **Deprecation policy:** deprecate in a minor with a `@deprecated` JSDoc and a runtime dev-warning, keep for at least one
  minor release, remove in the next major. Each removal ships a migration guide (`docs/migrations/`) and, if mechanical, a codemod.
- Publishing: GitHub Actions workflow with npm provenance (`--provenance`). Until the owner approves, only
  `pnpm changeset publish --dry-run` / `npm publish --dry-run` is run.
- `publint` and `@arethetypeswrong/cli` validate the packed output before release.

## Alternatives
- Lockstep versioning (Lerna fixed): simpler, but noisy majors for unrelated packages.
- semantic-release from commit messages: fully automatic, but monorepo support is awkward and release notes are less curated.

## Consequences
Release notes are written by humans at PR time; contributors must learn the changeset flow (documented in CONTRIBUTING).
