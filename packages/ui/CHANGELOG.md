# @kit/ui

## 0.3.0

### Minor Changes

- **Breaking:** remove the deprecated `loading` prop from `Button`; use `busy`. Migrate automatically with `npx jscodeshift --parser=tsx -t node_modules/@kit/ui/codemods/button-loading-to-busy.cjs "src/**/*.tsx"`. See docs/migrations/ui-0.2-to-0.3.md. (`@kit/ui` is pre-1.0, so breaking changes ship in a minor.)

## 0.2.0

### Minor Changes

- Add `busy` to `Button` and deprecate `loading`. `loading` keeps working and logs a one-time development warning. It will be removed in the next release (see docs/migrations/ui-0.2-to-0.3.md).
