# @kit/auth

OIDC authorization-code + PKCE **backend-for-frontend**. The browser only ever holds an opaque `HttpOnly` session cookie; tokens stay on the server.
Design rationale: [ADR 0005](../../docs/adr/0005-auth-design.md). Threats: [THREAT_MODEL](docs/THREAT_MODEL.md). Hardening: [SECURITY_GUIDE](docs/SECURITY_GUIDE.md).

```ts
import { createBff } from "@kit/auth";

const bff = createBff({
  issuer: "https://idp.example.com", clientId: "web", clientSecret: process.env.OIDC_SECRET,
  redirectUri: "https://app.example.com/auth/callback", allowedOrigins: ["https://app.example.com"],
  store: myRedisStore, // implements SessionStore; defaults to in-memory (tests only)
});

// Any Fetch-API runtime (Next.js route handler, Cloudflare Worker):
export const GET = (req: Request) => bff.handle(req);   // /auth/login, /auth/callback, /auth/session
export const POST = (req: Request) => bff.handle(req);  // /auth/logout

// Server-side call to an upstream API; refreshes and rotates transparently:
const token = await bff.getAccessToken(req);
```

Client side: `GET /auth/session` returns `{ user, csrfToken }`. Send `X-CSRF-Token` on every unsafe request.

## Tests
`pnpm --filter @kit/auth test` runs 42 tests against an in-process mock IdP (`@kit/auth/testing`, `startMockOidc`).
Line coverage 100%, branch ~91% at last run (thresholds enforced: 90 lines / 80 branches).
Sanity check done by hand: disabling the CSRF check or the login-transaction check makes 2 tests fail each.
