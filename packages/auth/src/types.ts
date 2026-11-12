export interface Tokens { accessToken: string; refreshToken?: string; idToken: string; /** epoch seconds */ expiresAt: number }
export interface SessionUser { sub: string; name?: string; email?: string }
export interface Session { id: string; user: SessionUser; tokens: Tokens; csrfToken: string; createdAt: number }

/** Server-side storage. Production: Redis/KV/Durable Object. Tokens never leave this boundary. */
export interface SessionStore {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface BffConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  /** Absolute URL of the callback route, e.g. https://app.example.com/auth/callback */
  redirectUri: string;
  /** Origins allowed to make state-changing requests (CSRF Origin check). */
  allowedOrigins: string[];
  scopes?: string[];
  /** Route prefix handled by `handle`. Default "/auth". */
  basePath?: string;
  store?: SessionStore;
  /** Set false only for plain-http local development. Disables the __Host- prefix (which requires Secure). */
  secure?: boolean;
  sessionTtlSeconds?: number;
  /** Seconds before expiry at which the access token is refreshed. Default 30. */
  refreshSkewSeconds?: number;
  fetch?: typeof fetch;
  now?: () => number;
}
