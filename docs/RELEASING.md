# Releasing

Policy: [ADR 0004](adr/0004-versioning-and-release.md). Independent semver per package. Pre-1.0: breaking changes ship in a minor.

1. In your PR, run `pnpm changeset`, pick the packages and bump type, write the user-facing note.
2. CI (`changeset status --since origin/main`) fails PRs that change a published package without a changeset.
3. Maintainer runs `pnpm version-packages` (bumps versions, writes CHANGELOGs, deletes consumed changesets) and commits.
4. `pnpm release:dry-run`: build, `publint --strict`, `attw --pack` (node16 profile) and `pnpm publish --dry-run` per package.
5. Publishing is **manual and requires owner approval**. Not done in this repo yet. Provenance (`npm publish --provenance`) needs a public GitHub repo and an OIDC-enabled workflow **[UNVERIFIED]**.

## Deprecation lifecycle (worked example)
`Button` `loading` to `busy`: see CHANGELOG of `@kit/ui` 0.2.0 and 0.3.0, the [migration guide](migrations/ui-0.2-to-0.3.md) and the codemod.
