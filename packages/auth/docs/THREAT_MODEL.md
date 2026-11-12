# @kit/auth threat model

Scope: the BFF in `src/bff.ts` between a browser and an OIDC provider. Assets: access/refresh/ID tokens, the session, user identity.
Trust boundaries: browser (untrusted, may run attacker script after XSS) | BFF + session store (trusted) | IdP (trusted, assumed correct).
Each row names the test in `src/bff.test.ts` that exercises the control. Tests run against the mock IdP in `src/testing`.

| # | STRIDE | Threat | Control | Test |
|---|---|---|---|---|
| 1 | Info disclosure | XSS steals tokens from storage/JS | Tokens exist only server-side; browser gets an opaque HttpOnly session cookie | "never exposes access, refresh or ID tokens…" |
| 2 | Info disclosure | XSS reads the cookie | `HttpOnly`; `Secure`; no `Domain`; `__Host-` prefix | same test (attributes) |
| 3 | Elevation | XSS *uses* the session (riding it) | **Not prevented by this package.** Mitigated by CSRF header requirement only against cross-site attackers; same-origin script can read the CSRF token from `/session`. Defence is CSP (see SECURITY_GUIDE) | documented limit, no test possible |
| 4 | Tampering | Hostile claim (`name`) rendered as HTML | JSON-only responses, `nosniff`; error pages are fixed text/plain, nothing reflected | "hostile name claim…", "does not reflect IdP error parameters" |
| 5 | Spoofing | CSRF on state-changing routes | `SameSite=Lax`, Origin / Sec-Fetch-Site check, per-session `X-CSRF-Token` (constant-time compare) | "CSRF protection" suite |
| 6 | Spoofing | Login CSRF / forced login with attacker's code | `state` bound to a tx cookie + server-side tx, single use | "mismatched state", "without the tx cookie", "replay of the same callback" |
| 7 | Spoofing | Authorization code interception | PKCE S256; IdP verifies verifier | RFC vector test; "token endpoint rejects the PKCE verifier" |
| 8 | Spoofing | Forged / mis-targeted ID token | Signature (JWKS), `iss`, `aud`, `exp`, `nonce` validated | "ID token validation" table (5 cases) |
| 9 | Spoofing | Session fixation | New random session id at login | "new session id on every login" |
| 10 | Tampering | Open redirect via `returnTo` | Relative same-origin paths only | `safeReturnTo` table, login test |
| 11 | Elevation | Stolen refresh token replay | Rotation each use; IdP reuse detection revokes the family; BFF ends the session on `invalid_grant` | "reuse of a rotated refresh token…" |
| 12 | DoS / race | Concurrent refresh burns the single-use token | Single-flight per session | "single-flights concurrent refreshes" |
| 13 | Info disclosure | Cross-origin reads of BFF responses | No CORS headers; same-origin only | "sets no CORS headers" |
| 14 | Info disclosure | Caching of session data | `Cache-Control: no-store` | "no-store and nosniff" |
| 15 | Info disclosure | Error detail leakage | Generic 500 / fixed messages | "500 without leaking details" |

## Residual risks and gaps (honest list)
- **XSS riding (row 3)** is inherent to any browser session. Only CSP / Trusted Types reduce it.
- **Session store** is in-memory in tests; a production store (Redis/KV) must encrypt at rest and enforce TTLs. **[UNVERIFIED]** no production store is implemented.
- **Refresh failures other than `invalid_grant`** throw; the caller must handle them (test covers throw).
- **No rate limiting / bot protection** on `/login`; expected at the edge.
- **RP-initiated logout** at the IdP and back-channel logout are not implemented.
- **Mock IdP is not a conformance test.** Behaviour against a real IdP (Keycloak, Auth0, Google) is **[UNVERIFIED]**.
- ID tokens are not re-validated on refresh responses (no new ID token is requested).
