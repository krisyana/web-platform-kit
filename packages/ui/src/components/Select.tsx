import { forwardRef, type SelectHTMLAttributes } from "react";
import { FieldShell, useField, type FieldProps } from "./Field";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {}

/** Wraps a native <select>: keyboard, mobile pickers and screen readers come from the platform (ADR 0006). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, error, className, id: idProp, children, ...rest }, ref) {
  const { id, hintId, errorId, controlProps } = useField({ hint, error }, idProp);
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} hintId={hintId} errorId={errorId}>
      <select ref={ref} className={["kit-select", className].filter(Boolean).join(" ")} {...controlProps} {...rest}>{children}</select>
    </FieldShell>
  );
});
