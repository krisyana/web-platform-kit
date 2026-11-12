# Migrating `@kit/ui` 0.2 to 0.3

## Breaking: `Button` `loading` prop removed

| Version | Behaviour |
|---|---|
| 0.1.x | `loading` |
| 0.2.0 | `busy` added; `loading` deprecated, still works, one-time dev warning |
| 0.3.0 | `loading` removed (TypeScript error; at runtime it would be forwarded to the DOM as an unknown attribute) |

Reason: `busy` matches the `aria-busy` semantics it sets.

### Automatic
```bash
npx jscodeshift --parser=tsx -t node_modules/@kit/ui/codemods/button-loading-to-busy.cjs "src/**/*.tsx"
```
Renames `loading` to `busy` on `<Button>` imported from `@kit/ui` (aliases handled, other components untouched, idempotent).
Elements that already have `busy` are reported and left for manual fixing.

### Manual
```diff
-<Button loading={isSaving}>Save</Button>
+<Button busy={isSaving}>Save</Button>
```
Not covered by the codemod: `<Button {...props}>` spreads that contain `loading`, and wrappers that re-export `Button` under another module path. Search for `loading` in those.

### Verify
`tsc --noEmit` should report no `loading` errors.
Evidence for the codemod: `packages/ui/codemods/button-loading-to-busy.test.ts` (6 cases) and a manual CLI run on a sample file.
