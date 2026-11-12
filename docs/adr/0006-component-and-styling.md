# ADR 0006: Component and styling approach

- Status: Accepted
- Date: 2026-11-12

## Decision
- **Design tokens** are the source of truth: `tokens.ts` (typed) generates `tokens.css` with CSS custom properties
  for `:root` (light) and `[data-theme="dark"]` (plus `prefers-color-scheme` default when no theme is set).
- Components use **plain CSS files with BEM-ish class names prefixed `kit-`** referencing tokens. No runtime CSS-in-JS: works with strict CSP and server components.
- **Native-first accessibility:** prefer native elements whose semantics browsers already implement.
  - `Dialog` wraps native `<dialog>` + `showModal()` (focus trap, `inert` background, Esc handling by the browser).
  - `Select` wraps native `<select>` (full keyboard, mobile pickers, screen reader support). A custom listbox is deliberately avoided; trade-off documented.
  - `Button`, `Input` wrap `<button>`/`<input>` with label, description and error wiring through `aria-*`.
  - `Toast` uses a polite `role="status"` live region (assertive `role="alert"` for errors).
- Theme: `ThemeProvider` sets `data-theme` on `<html>`, persists choice, respects `prefers-color-scheme`, and exposes a `useTheme` hook.
- Every component ships: types, tests (behaviour + axe), a Storybook story, and a documented keyboard/screen reader contract.
- No dependencies beyond React as a peer dependency.

## Consequences
Less visual flexibility than headless libraries (Radix/Ariakit); in return a tiny bundle and few failure modes. If richer widgets (combobox, menu) are needed later, wrap a headless library behind the same token layer.
