import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface ToastOptions {
  message: string;
  variant?: "info" | "error";
  /** Milliseconds before auto-dismiss. 0 keeps it until dismissed. Errors default to 0 (WCAG 2.2.1 timing). */
  duration?: number;
}
interface ToastItem extends Required<ToastOptions> { id: number }

const ToastContext = createContext<{ toast: (o: ToastOptions) => number; dismiss: (id: number) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const dismiss = useCallback((id: number) => setItems((s) => s.filter((t) => t.id !== id)), []);
  const toast = useCallback((o: ToastOptions) => {
    const variant = o.variant ?? "info";
    const id = nextId.current++;
    setItems((s) => [...s, { id, message: o.message, variant, duration: o.duration ?? (variant === "error" ? 0 : 5000) }]);
    return id;
  }, []);
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Live regions are always mounted so assistive tech registers them before content arrives. */}
      <div className="kit-toast-region">
        <div role="status" aria-live="polite">
          {items.filter((t) => t.variant === "info").map((t) => <ToastView key={t.id} item={t} dismiss={dismiss} />)}
        </div>
        <div role="alert">
          {items.filter((t) => t.variant === "error").map((t) => <ToastView key={t.id} item={t} dismiss={dismiss} />)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  useEffect(() => {
    if (!item.duration) return;
    const t = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item, dismiss]);
  return (
    <div className={`kit-toast kit-toast--${item.variant}`}>
      <span>{item.message}</span>
      <button type="button" className="kit-toast__close" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}>×</button>
    </div>
  );
}
