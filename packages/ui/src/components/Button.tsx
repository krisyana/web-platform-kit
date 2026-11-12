import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  /** Marks the button busy; stays focusable and ignores clicks. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, className, type = "button", onClick, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={["kit-button", `kit-button--${variant}`, className].filter(Boolean).join(" ")}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={(e) => { if (loading) { e.preventDefault(); return; } onClick?.(e); }}
      {...rest}
    >
      {children}
    </button>
  );
});
