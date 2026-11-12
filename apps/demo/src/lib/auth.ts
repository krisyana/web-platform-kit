import { createBff, MemorySessionStore } from "@kit/auth";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
type G = typeof globalThis & { __kitBff?: ReturnType<typeof createBff> };

/**
 * Singleton BFF. The in-memory session store only works for a single long-lived Node process.
 * On Cloudflare Workers, isolates are ephemeral, so a KV/Durable Object store is required (not implemented: UNVERIFIED).
 */
export const bff = ((globalThis as G).__kitBff ??= createBff({
  issuer: process.env.OIDC_ISSUER ?? "http://127.0.0.1:4010",
  clientId: process.env.OIDC_CLIENT_ID ?? "demo-client",
  ...(process.env.OIDC_CLIENT_SECRET && { clientSecret: process.env.OIDC_CLIENT_SECRET }),
  redirectUri: `${appUrl}/api/auth/callback`,
  allowedOrigins: [appUrl],
  basePath: "/api/auth",
  secure: appUrl.startsWith("https://"),
  store: new MemorySessionStore(),
}));
