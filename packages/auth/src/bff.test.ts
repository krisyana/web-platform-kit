import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createBff, MemorySessionStore, pkceChallenge, safeReturnTo } from "./index";
import { startMockOidc } from "./testing";
import { parseCookies } from "./cookies";

const APP = "https://app.test";
let idp: Awaited<ReturnType<typeof startMockOidc>>;
let store: MemorySessionStore;
let nowMs: number;
const mk = (over = {}) => createBff({ issuer: idp.issuer, clientId: "demo-client", redirectUri: `${APP}/auth/callback`, allowedOrigins: [APP], store, now: () => nowMs, ...over });
let bff: ReturnType<typeof mk>;

beforeAll(async () => { idp = await startMockOidc(); });
afterAll(() => idp.close());
beforeEach(() => { store = new MemorySessionStore(() => nowMs); nowMs = Date.now(); idp.options.idToken = undefined; idp.options.user = { sub: "user-1", name: "Ada", email: "ada@example.com" }; idp.options.accessTokenTtl = 300; bff = mk(); });

const cookieHeader = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).filter((c) => !c!.endsWith("=")).join("; ");
async function startLogin(b = bff, returnTo = "/dashboard") {
  const res = await b.handle(new Request(`${APP}/auth/login?returnTo=${encodeURIComponent(returnTo)}`));
  return { res, tx: cookieHeader(res), authorizeUrl: res.headers.get("location")! };
}
async function login(b = bff, returnTo = "/dashboard") {
  const { tx, authorizeUrl } = await startLogin(b, returnTo);
  const cb = await idp.authorize(authorizeUrl);
  const res = await b.handle(new Request(cb.replace(/^https?:\/\/[^/]+/, APP), { headers: { cookie: tx } }));
  return { res, cookie: cookieHeader(res), callbackUrl: cb, tx };
}
const sessionOf = async (cookie: string) => (await (await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie } }))).json()) as { csrfToken: string; user: { name: string } };

describe("units", () => {
  it("PKCE S256 matches the RFC 7636 appendix B vector", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "/ok\n//evil", "", null, undefined])("returnTo %j falls back to /", (v) => {
    expect(safeReturnTo(v as string)).toBe("/");
  });
  it("keeps legitimate relative paths", () => { expect(safeReturnTo("/a/b?c=1#d")).toBe("/a/b?c=1#d"); });
  it("MemorySessionStore expires entries", async () => {
    let t = 0; const s = new MemorySessionStore(() => t);
    await s.set("k", 1, 1); expect(await s.get("k")).toBe(1); t = 1001; expect(await s.get("k")).toBeUndefined();
  });
});

describe("authorization code + PKCE flow", () => {
  it("redirects to the IdP with S256 challenge, state and nonce, and sets a tx cookie", async () => {
    const { res, authorizeUrl } = await startLogin();
    expect(res.status).toBe(302);
    const q = new URL(authorizeUrl).searchParams;
    expect(q.get("code_challenge_method")).toBe("S256");
    expect(q.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    expect(q.get("state")).toBeTruthy(); expect(q.get("nonce")).toBeTruthy();
    expect(q.get("response_type")).toBe("code");
  });
  it("completes login, lands on returnTo, and exposes only user + csrf token to the browser", async () => {
    const { res, cookie } = await login();
    expect(res.status).toBe(302); expect(res.headers.get("location")).toBe("/dashboard");
    const s = await sessionOf(cookie);
    expect(s.user.name).toBe("Ada"); expect(s.csrfToken).toBeTruthy();
  });
  it("returns 401 for /session without a cookie", async () => {
    expect((await bff.handle(new Request(`${APP}/auth/session`))).status).toBe(401);
  });
  it("rejects an open-redirect returnTo during login", async () => {
    const { res } = await login(bff, "//evil.com/phish");
    expect(res.headers.get("location")).toBe("/");
  });
  it("rejects a callback with a mismatched state", async () => {
    const { tx, authorizeUrl } = await startLogin();
    const cb = new URL((await idp.authorize(authorizeUrl)).replace(/^https?:\/\/[^/]+/, APP)); cb.searchParams.set("state", "attacker");
    expect((await bff.handle(new Request(cb, { headers: { cookie: tx } }))).status).toBe(400);
  });
  it("rejects a callback without the tx cookie (login CSRF / fixation)", async () => {
    const { authorizeUrl } = await startLogin();
    const cb = (await idp.authorize(authorizeUrl)).replace(/^https?:\/\/[^/]+/, APP);
    expect((await bff.handle(new Request(cb))).status).toBe(400);
  });
  it("rejects replay of the same callback (tx is single use) and IdP rejects code reuse", async () => {
    const { tx, authorizeUrl } = await startLogin();
    const cb = (await idp.authorize(authorizeUrl)).replace(/^https?:\/\/[^/]+/, APP);
    expect((await bff.handle(new Request(cb, { headers: { cookie: tx } }))).status).toBe(302);
    expect((await bff.handle(new Request(cb, { headers: { cookie: tx } }))).status).toBe(400);
  });
  it("does not reflect IdP error parameters (XSS) and answers text/plain", async () => {
    const { tx } = await startLogin();
    const res = await bff.handle(new Request(`${APP}/auth/callback?error=%3Cscript%3Ealert(1)%3C/script%3E`, { headers: { cookie: tx } }));
    const body = await res.text();
    expect(res.status).toBe(400); expect(res.headers.get("content-type")).toContain("text/plain");
    expect(body).not.toContain("<script>"); expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
  it("returns 404 outside the base path and unknown routes", async () => {
    expect((await bff.handle(new Request(`${APP}/other`))).status).toBe(404);
    expect((await bff.handle(new Request(`${APP}/auth/nope`))).status).toBe(404);
  });
  it("reports 500 without leaking details when the IdP is unreachable", async () => {
    const dead = createBff({ issuer: "http://127.0.0.1:1", clientId: "x", redirectUri: `${APP}/auth/callback`, allowedOrigins: [APP], store });
    const res = await dead.handle(new Request(`${APP}/auth/login`));
    expect(res.status).toBe(500); expect(await res.text()).toBe("Internal error");
  });
  it("supports non-secure dev mode (no __Host- prefix, no Secure)", async () => {
    const dev = mk({ secure: false });
    const { res } = await startLogin(dev);
    const c = res.headers.getSetCookie()[0]!;
    expect(c).toMatch(/^kit_tx=/); expect(c).not.toContain("Secure");
  });
});

describe("ID token validation", () => {
  it.each([
    ["wrong nonce", { nonce: "other" }], ["wrong audience", { aud: "someone-else" }], ["wrong issuer", { iss: "https://evil.example" }],
    ["expired", { expSeconds: -3600 }], ["bad signature", { signWithOtherKey: true }],
  ])("rejects an ID token with %s", async (_n, tamper) => {
    idp.options.idToken = tamper;
    const { res, cookie } = await login();
    expect(res.status).toBe(401); expect(cookie).toBe("");
  });
  it("fails when the token endpoint rejects the PKCE verifier", async () => {
    const { tx, authorizeUrl } = await startLogin();
    const u = new URL(authorizeUrl); u.searchParams.set("code_challenge", await pkceChallenge("a-different-verifier"));
    const cb = (await idp.authorize(u.toString())).replace(/^https?:\/\/[^/]+/, APP);
    expect((await bff.handle(new Request(cb, { headers: { cookie: tx } }))).status).toBe(502);
  });
});

describe("token leakage and cookie policy", () => {
  it("never exposes access, refresh or ID tokens to the browser, and cookies are HttpOnly + Secure + SameSite + __Host-", async () => {
    const before = idp.stats.issued.length;
    const { res, cookie, callbackUrl } = await login();
    const sessionRes = await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie } }));
    const issued = idp.stats.issued.slice(before);
    expect(issued.length).toBeGreaterThanOrEqual(2);
    const surface = [await sessionRes.clone().text(), JSON.stringify([...res.headers]), JSON.stringify([...sessionRes.headers]), res.headers.getSetCookie().join("\n"), callbackUrl.replace(/code=[^&]+/, "")].join("\n");
    for (const secret of issued) expect(surface).not.toContain(secret);
    const stored = (await store.get(`sess:${parseCookies(cookie)["__Host-kit_sid"]}`)) as { tokens: { idToken: string } };
    expect(surface).not.toContain(stored.tokens.idToken); // ID token stays server-side too
    const setCookies = res.headers.getSetCookie();
    const sid = setCookies.find((c) => c.startsWith("__Host-kit_sid="))!;
    expect(sid).toMatch(/; HttpOnly/); expect(sid).toMatch(/; Secure/); expect(sid).toMatch(/; SameSite=Lax/); expect(sid).toMatch(/; Path=\//); expect(sid).not.toMatch(/Domain=/);
    for (const c of setCookies) { expect(c).toMatch(/HttpOnly/); expect(c).toMatch(/^__Host-/); }
  });
  it("issues a new session id on every login (no fixation) and the session cookie value is opaque", async () => {
    const a = await login(); const b = await login();
    expect(a.cookie).not.toBe(b.cookie); expect(a.cookie).toMatch(/^__Host-kit_sid=[\w-]{43}$/);
  });
  it("marks API responses no-store and nosniff, and renders a hostile name claim only as JSON data", async () => {
    idp.options.user = { sub: "u2", name: "<img src=x onerror=alert(1)>" };
    const { cookie } = await login();
    const res = await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie } }));
    expect(res.headers.get("cache-control")).toBe("no-store"); expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(((await res.json()) as { user: { name: string } }).user.name).toBe("<img src=x onerror=alert(1)>"); // data, escaped by JSON; UI must render as text
  });
  it("sets no CORS headers on any route (same-origin only)", async () => {
    const { cookie } = await login();
    const res = await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie, origin: "https://evil.example" } }));
    expect([...res.headers.keys()].filter((k) => k.startsWith("access-control-"))).toEqual([]);
  });
});

describe("CSRF protection", () => {
  const logout = (cookie: string, headers: Record<string, string> = {}) => bff.handle(new Request(`${APP}/auth/logout`, { method: "POST", headers: { cookie, ...headers } }));
  it("rejects logout with no CSRF header, wrong token, or foreign origin", async () => {
    const { cookie } = await login(); const { csrfToken } = await sessionOf(cookie);
    expect((await logout(cookie, { origin: APP })).status).toBe(403);
    expect((await logout(cookie, { origin: APP, "x-csrf-token": "wrong" })).status).toBe(403);
    expect((await logout(cookie, { origin: "https://evil.example", "x-csrf-token": csrfToken })).status).toBe(403);
    expect((await logout(cookie, { "x-csrf-token": csrfToken })).status).toBe(403); // no Origin and no Sec-Fetch-Site
    expect((await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie } }))).status).toBe(200); // still logged in
  });
  it("accepts a valid token with Origin or Sec-Fetch-Site, destroys the session and clears the cookie", async () => {
    const { cookie } = await login(); const { csrfToken } = await sessionOf(cookie);
    const res = await logout(cookie, { "sec-fetch-site": "same-origin", "x-csrf-token": csrfToken });
    expect(res.status).toBe(204); expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie } }))).status).toBe(401);
  });
  it("logout without a session is idempotent", async () => { expect((await logout("")).status).toBe(204); });
  it("exposes verifyCsrf for app routes (safe methods pass, unsafe need the token)", async () => {
    const { cookie } = await login(); const { csrfToken } = await sessionOf(cookie);
    expect(await bff.verifyCsrf(new Request(`${APP}/x`))).toBe(true);
    expect(await bff.verifyCsrf(new Request(`${APP}/x`, { method: "POST", headers: { cookie, origin: APP } }))).toBe(false);
    expect(await bff.verifyCsrf(new Request(`${APP}/x`, { method: "POST", headers: { cookie, origin: APP, "x-csrf-token": csrfToken } }))).toBe(true);
    expect(await bff.verifyCsrf(new Request(`${APP}/x`, { method: "POST" }))).toBe(false);
  });
});

describe("refresh, rotation and reuse detection", () => {
  const req = (cookie: string) => new Request(`${APP}/x`, { headers: { cookie } });
  it("returns null without a session and the cached token while it is fresh (no IdP call)", async () => {
    expect(await bff.getAccessToken(req(""))).toBeNull();
    const { cookie } = await login(); const calls = idp.stats.tokenRequests.refresh_token ?? 0;
    expect(await bff.getAccessToken(req(cookie))).toBeTruthy();
    expect(idp.stats.tokenRequests.refresh_token ?? 0).toBe(calls);
  });
  it("refreshes near expiry, rotates the refresh token, and keeps the session", async () => {
    const { cookie } = await login(); const sid = parseCookies(cookie)["__Host-kit_sid"]!;
    const before = (await store.get(`sess:${sid}`)) as { tokens: { accessToken: string; refreshToken: string } };
    nowMs += 290_000; // within the 30 s skew of a 300 s token
    const t = await bff.getAccessToken(req(cookie));
    const after = (await store.get(`sess:${sid}`)) as { tokens: { accessToken: string; refreshToken: string } };
    expect(t).toBe(after.tokens.accessToken); expect(t).not.toBe(before.tokens.accessToken);
    expect(after.tokens.refreshToken).not.toBe(before.tokens.refreshToken);
  });
  it("single-flights concurrent refreshes (one IdP request)", async () => {
    const { cookie } = await login(); nowMs += 290_000; const n = idp.stats.tokenRequests.refresh_token ?? 0;
    const tokens = await Promise.all([1, 2, 3, 4, 5].map(() => bff.getAccessToken(req(cookie))));
    expect(new Set(tokens).size).toBe(1); expect((idp.stats.tokenRequests.refresh_token ?? 0) - n).toBe(1);
  });
  it("reuse of a rotated refresh token revokes the family and ends the session", async () => {
    const { cookie } = await login(); const sid = parseCookies(cookie)["__Host-kit_sid"]!;
    const old = ((await store.get(`sess:${sid}`)) as { tokens: { refreshToken: string } }).tokens.refreshToken;
    nowMs += 290_000; await bff.getAccessToken(req(cookie)); // rotates
    expect((await idp.replayRefresh(old)).status).toBe(400); // attacker replays the old token: family revoked
    nowMs += 290_000;
    expect(await bff.getAccessToken(req(cookie))).toBeNull(); // legitimate refresh now fails
    expect((await bff.handle(new Request(`${APP}/auth/session`, { headers: { cookie } }))).status).toBe(401); // session destroyed
  });
  it("throws (not a silent logout) on non-invalid_grant refresh failures and ends sessions without a refresh token", async () => {
    const { cookie } = await login(); const sid = parseCookies(cookie)["__Host-kit_sid"]!;
    const failing = mk({ fetch: (async (u: RequestInfo | URL, i?: RequestInit) => String(u).endsWith("/token") && String(i?.body).includes("refresh_token") ? new Response("{}", { status: 500 }) : fetch(u, i)) as typeof fetch });
    nowMs += 290_000;
    await expect(failing.getAccessToken(req(cookie))).rejects.toThrow("Token refresh failed");
    const s = (await store.get(`sess:${sid}`)) as { tokens: Record<string, unknown> };
    delete s.tokens.refreshToken; await store.set(`sess:${sid}`, s, 100);
    expect(await bff.getAccessToken(req(cookie))).toBeNull();
  });
});
