import { forwardRef, type ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  /** Marks the button busy; stays focusable and ignores clicks. */
  busy?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", busy, className, type = "button", onClick, children, ...rest },
  ref,
) {
  const isBusy = busy ?? false;
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
