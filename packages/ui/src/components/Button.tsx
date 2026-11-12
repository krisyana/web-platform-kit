import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  /** Marks the button busy; stays focusable and ignores clicks. */
  busy?: boolean;
  /** @deprecated Renamed to `busy` for consistency with `aria-busy`. Removed in the next release; run the `button-loading-to-busy` codemod. */
  loading?: boolean;
}

let warned = false;
function warnLoadingDeprecated() {
  const isProd = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  if (warned || isProd) return;
  warned = true;
  console.warn("[@kit/ui] <Button loading> is deprecated: use `busy`. See docs/migrations/ui-0.2-to-0.3.md");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", busy, loading, className, type = "button", onClick, children, ...rest },
  ref,
) {
  if (loading !== undefined) warnLoadingDeprecated();
  const isBusy = busy ?? loading ?? false;
  return (
    <button
      ref={ref}
      type={type}
      className={["kit-button", `kit-button--${variant}`, className].filter(Boolean).join(" ")}
      aria-busy={isBusy || undefined}
      aria-disabled={isBusy || undefined}
      onClick={(e) => { if (isBusy) { e.preventDefault(); return; } onClick?.(e); }}
      {...rest}
    >
      {children}
    </button>
  );
});
