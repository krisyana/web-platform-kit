# @kit/ui

Accessible, token-driven React components. No runtime CSS-in-JS, no dependencies beyond React.

```tsx
import "@kit/ui/styles.css";
import { ThemeProvider, ToastProvider, Button, Input } from "@kit/ui";
```

Components: `Button`, `Input`, `Select`, `Dialog`, `ToastProvider`/`useToast`, `ThemeProvider`/`useTheme`.
Theming: design tokens in `src/tokens.json` become `--kit-*` CSS variables; dark mode via `data-theme="dark"` or `prefers-color-scheme`.

- Keyboard and screen-reader contract: [docs/a11y.md](docs/a11y.md)
- Design rationale: [ADR 0006](../../docs/adr/0006-component-and-styling.md)
- Develop: `pnpm build && pnpm storybook`; test: `pnpm test`

SSR note: `ThemeProvider` applies the stored theme after mount, so a dark-preferring user with a stored choice may see a flash. A blocking inline script fixes this but needs a CSP nonce; **[UNVERIFIED]** until the demo app (M6).
