# ADR 0005: Auth design (OIDC with a backend-for-frontend)

- Status: Accepted (implemented in M2; see `packages/auth/docs/THREAT_MODEL.md`)
- Date: 2026-11-12

## Context
Browser SPAs that hold access or refresh tokens in JS-accessible storage are exposed to token theft by XSS.
Current IETF guidance for browser-based apps (OAuth 2.0 for Browser-Based Applications, BCP draft) recommends a
**backend-for-frontend (BFF)** as the most secure pattern. `[UNVERIFIED]`: confirm the exact current draft/RFC number before citing in public docs.

## Decision
- Flow: **Authorization Code + PKCE (S256)** with `state` and `nonce`; ID token validated (signature via JWKS, `iss`, `aud`, `exp`, `nonce`).
- The **BFF** (framework-agnostic request handlers, with a Next.js adapter) is the only OAuth client. Browser JS never sees
  access, refresh or ID tokens.
- Session: opaque session id in a cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; __Host-` prefix. Tokens live in a server-side session store (interface; in-memory for tests, pluggable for prod).
- **Refresh rotation:** refresh happens server-side on demand; refresh tokens are rotated each use; reuse of a rotated token
  is detected **by the IdP**, which revokes the token family; the BFF then receives `invalid_grant` and destroys the session (implemented and tested against the mock IdP; real IdP behaviour `[UNVERIFIED]`). Concurrent refreshes are single-flighted per session.
- **CSRF:** `SameSite=Lax` plus a custom header requirement (`X-CSRF` double-submit token bound to the session) on all state-changing BFF routes, and `Origin` header check.
- **Logout:** server session destroyed, cookie cleared, optional RP-initiated logout at the IdP.
- **Redirect safety:** `returnTo` validated against an allow-list of same-origin relative paths (open-redirect prevention).
- **CSP / CORS / cookies:** policy guide in `packages/auth/docs/`; BFF routes are same-origin so CORS is **off by default** (no `Access-Control-Allow-*`).
- Tests use a local **mock OIDC provider** (in-process HTTP server issuing signed JWTs with a generated key set).

## Alternatives rejected
- Tokens in `localStorage`/memory in the SPA: simplest, but XSS exfiltrates them.
- Implicit flow: deprecated.
- Token-handler via third-party SaaS: not demonstrable as platform code.

## Consequences
Requires a server component (Next route handlers / Cloudflare Worker). A session store is a stateful dependency; on Cloudflare this maps to KV or Durable Objects (`[UNVERIFIED]` until M6).
