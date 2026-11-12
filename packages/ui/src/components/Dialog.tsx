import { useEffect, useId, useRef, type ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons rendered in the footer. */
  actions?: ReactNode;
}

/**
 * Modal dialog on the native <dialog> element. The browser provides the focus trap,
 * inert background, Esc to close and focus restoration to the opener.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="kit-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // The backdrop is part of the <dialog> box for hit-testing, but so is its padding: compare against the rect.
        const r = e.currentTarget.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (e.target === e.currentTarget && !inside) onClose();
      }}
    >
      <h2 className="kit-dialog__title" id={titleId}>{title}</h2>
      <div>{children}</div>
      {actions && <div className="kit-dialog__actions">{actions}</div>}
    </dialog>
  );
}
