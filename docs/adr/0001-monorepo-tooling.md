# ADR 0001: Monorepo tooling

- Status: Accepted
- Date: 2026-11-12

## Context
Several versioned packages plus a consuming demo app must be developed, tested and released together,
with fast CI and strict dependency hygiene.

## Options
| Option | Pros | Cons |
|---|---|---|
| **pnpm workspaces + Turborepo** | Strict, symlinked node_modules (no phantom deps); task graph with local/remote cache; tiny config | Turborepo is a build orchestrator only; versioning needs Changesets |
| Nx | Richer generators, project graph, affected commands | Heavier, more config and concepts; overkill for 5 packages |
| npm/yarn workspaces + scripts | No extra tool | No caching or task graph; hoisting hides undeclared dependencies |

## Decision
pnpm workspaces for installation and linking; Turborepo for task orchestration and caching.
Shared config in `tooling/` (`tsconfig.base.json`). Internal dependencies use `workspace:*`.

## Consequences
- `pnpm install --frozen-lockfile` in CI; undeclared imports fail loudly.
- `turbo run build test typecheck` gives a cached DAG; CI cache keyed by lockfile.
- Pipeline definition lives in `turbo.json` and is the single source for task dependencies.
- Revisit Nx if the repo grows beyond ~15 packages or needs affected-only generators.
