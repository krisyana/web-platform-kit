import { useId, type ReactNode } from "react";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
}

/** Wires label, hint and error to a control through ids and aria-* attributes. */
export function useField({ hint, error }: Pick<FieldProps, "hint" | "error">, idProp?: string) {
  const auto = useId();
  const id = idProp ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return { id, hintId, errorId, controlProps: { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined } as const };
}

export function FieldShell(props: FieldProps & { id: string; hintId?: string | undefined; errorId?: string | undefined; children: ReactNode }) {
  return (
    <div className="kit-field">
      <label className="kit-field__label" htmlFor={props.id}>{props.label}</label>
      {props.children}
      {props.hint && <span className="kit-field__hint" id={props.hintId}>{props.hint}</span>}
      {props.error && <span className="kit-field__error" id={props.errorId}>{props.error}</span>}
    </div>
  );
}
