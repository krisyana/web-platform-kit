import { SpanStatusCode, trace } from "@opentelemetry/api";
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { Logger } from "./logger";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Rendered after an error. Receives the error and a reset function. */
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  logger?: Logger;
  onError?: (error: Error, info: ErrorInfo) => void;
}

/** Catches render errors, reports them to the logger and as an error span with the component stack. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const span = trace.getTracer("@kit/telemetry").startSpan("react.error_boundary", { attributes: { "react.component_stack": info.componentStack ?? "" } });
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    this.props.logger?.error("react render error", { error, componentStack: info.componentStack ?? "", trace_id: span.spanContext().traceId });
    span.end();
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === "function" ? fallback(error, this.reset) : fallback;
  }
}
