import { forwardRef, type InputHTMLAttributes } from "react";
import { FieldShell, useField, type FieldProps } from "./Field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, error, className, id: idProp, ...rest }, ref) {
  const { id, hintId, errorId, controlProps } = useField({ hint, error }, idProp);
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} hintId={hintId} errorId={errorId}>
      <input ref={ref} className={["kit-input", className].filter(Boolean).join(" ")} {...controlProps} {...rest} />
    </FieldShell>
  );
});
