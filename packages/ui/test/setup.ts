import "@testing-library/jest-dom/vitest";
import * as matchers from "vitest-axe/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(matchers);

// Newer Node versions expose a global `localStorage` that shadows jsdom's and can be undefined.
// A tiny in-memory Storage keeps tests independent of the Node version.
if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, String(v)), removeItem: (k: string) => void data.delete(k), clear: () => data.clear() };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}
afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.removeAttribute("data-theme"); });

// jsdom has no showModal/close for <dialog>. Minimal stand-in: real focus trapping is a browser
// behaviour and is covered by the Playwright visual/keyboard tests, not by jsdom.
HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) {
  if (!this.hasAttribute("open")) return;
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};

// axe probes canvas for icon-ligature detection; jsdom logs "not implemented". Return null silently.
// Colour contrast is NOT meaningfully checked under jsdom (no real CSS); it is checked in Storybook's a11y addon (real browser).
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
