import type { SessionStore } from "./types";

export class MemorySessionStore implements SessionStore {
  #m = new Map<string, { v: unknown; exp: number }>();
  constructor(private now: () => number = () => Date.now()) {}
  async get(key: string) {
    const e = this.#m.get(key);
    if (!e) return undefined;
    if (e.exp <= this.now()) { this.#m.delete(key); return undefined; }
    return e.v;
  }
  async set(key: string, value: unknown, ttlSeconds: number) { this.#m.set(key, { v: value, exp: this.now() + ttlSeconds * 1000 }); }
  async delete(key: string) { this.#m.delete(key); }
}
