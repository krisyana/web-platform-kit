# CSP, CORS and cookie policy guide

Recommendations that go with `@kit/auth`. The cookie and CORS items are asserted by tests; CSP items are guidance
that the demo app (M6) must prove with a browser test. **[UNVERIFIED]** until then.

## Cookies (tested)
| Cookie | Attributes | Why |
|---|---|---|
| `__Host-kit_sid` | `HttpOnly; Secure; SameSite=Lax; Path=/`, no `Domain` | Opaque session id; JS cannot read it; `__Host-` blocks subdomain overwrite |
| `__Host-kit_tx` | same, `Max-Age=600` | Binds the browser to one login attempt (state/nonce/PKCE live server-side) |

`SameSite=Lax` still sends cookies on top-level GET navigations, so state-changing routes must never be GET. Use `Strict` only if you can accept losing the session on inbound links.
Plain-http local development: `secure: false` drops `Secure` and the `__Host-` prefix. Never in production.

## CORS (tested: no CORS headers are emitted)
BFF routes are same-origin. Do not add `Access-Control-Allow-Origin`, and never combine `*` with credentials.
If a separate frontend origin is unavoidable, add an explicit single-origin allow-list *and* keep the CSRF header check. That variant is not supported or tested here.

## CSP (guidance)
Starting point for pages that use `@kit/ui` (no inline styles or scripts are required by the library):

```
default-src 'self';
script-src 'self' 'nonce-<per-request>' 'strict-dynamic';
style-src 'self';
img-src 'self' data:;
connect-src 'self' <telemetry-collector-origin>;
object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
```
- Use a per-request nonce for scripts; Next.js injects inline bootstrap scripts that need it.
- `style-src 'self'` works for `@kit/ui` (static CSS). Frameworks that inject inline styles need nonces or hashes.
- Add `require-trusted-types-for 'script'` once the app is audited for DOM sinks. **[UNVERIFIED]**
- Roll out with `Content-Security-Policy-Report-Only` and the telemetry package (M3) collecting reports before enforcing.

## Other headers
`Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` (BFF sets the last one itself).

## Verification checklist for adopters
1. `Set-Cookie` of your deployment shows the attributes above.
2. `curl -i -H 'Origin: https://evil.example' …/auth/session` returns no `access-control-*` headers.
3. POST to `/auth/logout` without `X-CSRF-Token` returns 403.
