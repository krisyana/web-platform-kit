import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { clearCookie, parseCookies, serializeCookie } from "./cookies";
import { pkceChallenge, randomToken, safeEqual } from "./crypto";
import { MemorySessionStore } from "./memory-store";
import { safeReturnTo } from "./redirect";
import type { BffConfig, Session, Tokens } from "./types";

interface Discovery { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string }
interface Tx { state: string; nonce: string; verifier: string; returnTo: string }
interface TokenResponse { access_token: string; refresh_token?: string; id_token?: string; expires_in?: number }

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
const HEADERS = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

const json = (status: number, body: unknown, extra: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...HEADERS, "content-type": "application/json", ...extra } });
/** Plain-text errors with fixed strings: nothing from the request is ever reflected (XSS). */
const text = (status: number, msg: string) => new Response(msg, { status, headers: { ...HEADERS, "content-type": "text/plain; charset=utf-8" } });

export function createBff(config: BffConfig) {
  const secure = config.secure ?? true;
  const base = (config.basePath ?? "/auth").replace(/\/$/, "");
  const now = config.now ?? (() => Date.now());
  const store = config.store ?? new MemorySessionStore(now);
  const doFetch = config.fetch ?? fetch;
  const sessionTtl = config.sessionTtlSeconds ?? 8 * 3600;
  const skew = config.refreshSkewSeconds ?? 30;
  const prefix = secure ? "__Host-" : "";
  const SID = `${prefix}kit_sid`, TX = `${prefix}kit_tx`;
  const scope = (config.scopes ?? ["openid", "profile", "email", "offline_access"]).join(" ");

  let discovery: Promise<Discovery> | undefined;
  let jwks: JWTVerifyGetKey | undefined;
  const getDiscovery = () => (discovery ??= (async () => {
    const res = await doFetch(`${config.issuer}/.well-known/openid-configuration`);
    if (!res.ok) throw new Error("OIDC discovery failed");
    const d = (await res.json()) as Discovery;
    if (d.issuer !== config.issuer) throw new Error("OIDC issuer mismatch");
    jwks = createRemoteJWKSet(new URL(d.jwks_uri));
    return d;
  })().catch((e) => { discovery = undefined; throw e; }));

  const getSession = async (req: Request): Promise<Session | null> => {
    const sid = parseCookies(req.headers.get("cookie"))[SID];
    if (!sid) return null;
    return ((await store.get(`sess:${sid}`)) as Session | undefined) ?? null;
  };
  const saveSession = (s: Session) => store.set(`sess:${s.id}`, s, sessionTtl);

  async function tokenRequest(params: Record<string, string>): Promise<{ ok: true; body: TokenResponse } | { ok: false; error: string }> {
    const d = await getDiscovery();
    const body = new URLSearchParams({ ...params, client_id: config.clientId });
    if (config.clientSecret) body.set("client_secret", config.clientSecret);
    const res = await doFetch(d.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    const data = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string };
    return res.ok ? { ok: true, body: data } : { ok: false, error: data.error ?? "token_error" };
  }

  function csrfOk(req: Request, session: Session): boolean {
    const origin = req.headers.get("origin");
    const originOk = origin ? config.allowedOrigins.includes(origin) : req.headers.get("sec-fetch-site") === "same-origin";
    const header = req.headers.get("x-csrf-token");
    return originOk && !!header && safeEqual(header, session.csrfToken);
  }

  async function login(url: URL): Promise<Response> {
    const d = await getDiscovery();
    const tx: Tx = { state: randomToken(), nonce: randomToken(), verifier: randomToken(48), returnTo: safeReturnTo(url.searchParams.get("returnTo")) };
    const txId = randomToken();
    await store.set(`tx:${txId}`, tx, 600);
    const auth = new URL(d.authorization_endpoint);
    auth.search = new URLSearchParams({
      response_type: "code", client_id: config.clientId, redirect_uri: config.redirectUri, scope,
      state: tx.state, nonce: tx.nonce, code_challenge: await pkceChallenge(tx.verifier), code_challenge_method: "S256",
    }).toString();
    const headers = new Headers({ ...HEADERS, location: auth.toString() });
    headers.append("set-cookie", serializeCookie(TX, txId, { maxAge: 600, secure }));
    return new Response(null, { status: 302, headers });
  }

  async function callback(req: Request, url: URL): Promise<Response> {
    const txId = parseCookies(req.headers.get("cookie"))[TX];
    const tx = txId ? ((await store.get(`tx:${txId}`)) as Tx | undefined) : undefined;
    if (txId) await store.delete(`tx:${txId}`); // single use, even on failure
    const fail = (status: number, msg: string) => { const r = text(status, msg); r.headers.append("set-cookie", clearCookie(TX, secure)); return r; };
    if (!tx) return fail(400, "Login session expired or missing");
    if (url.searchParams.has("error")) return fail(400, "Authentication failed");
    const state = url.searchParams.get("state"), code = url.searchParams.get("code");
    if (!state || !code || !safeEqual(state, tx.state)) return fail(400, "Invalid state");

    const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, code_verifier: tx.verifier });
    if (!t.ok || !t.body.id_token) return fail(502, "Token exchange failed");
    let claims;
    try {
      const d = await getDiscovery();
      claims = (await jwtVerify(t.body.id_token, jwks!, { issuer: d.issuer, audience: config.clientId, algorithms: ["RS256", "ES256", "PS256"], currentDate: new Date(now()) })).payload;
    } catch { return fail(401, "Invalid ID token"); }
    if (claims.nonce !== tx.nonce) return fail(401, "Invalid ID token");
    if (!claims.sub) return fail(401, "Invalid ID token");

    const session: Session = {
      id: randomToken(), // fresh id at login: no session fixation
      user: { sub: claims.sub, ...(typeof claims.name === "string" && { name: claims.name }), ...(typeof claims.email === "string" && { email: claims.email }) },
      tokens: toTokens(t.body, now()), csrfToken: randomToken(), createdAt: now(),
    };
    await saveSession(session);
    const headers = new Headers({ ...HEADERS, location: tx.returnTo });
    headers.append("set-cookie", serializeCookie(SID, session.id, { maxAge: sessionTtl, secure }));
    headers.append("set-cookie", clearCookie(TX, secure));
    return new Response(null, { status: 302, headers });
  }

  const toTokens = (r: TokenResponse, at: number, prev?: Tokens): Tokens => ({
    accessToken: r.access_token,
    ...((r.refresh_token ?? prev?.refreshToken) && { refreshToken: (r.refresh_token ?? prev?.refreshToken)! }),
    idToken: r.id_token ?? prev?.idToken ?? "",
    expiresAt: Math.floor(at / 1000) + (r.expires_in ?? 300),
  });

  const inflight = new Map<string, Promise<Session | null>>();
  /** Refresh with rotation. Single-flight per session: concurrent callers share one token request. */
  function refresh(session: Session): Promise<Session | null> {
    const existing = inflight.get(session.id);
    if (existing) return existing;
    const p = (async () => {
      if (!session.tokens.refreshToken) { await store.delete(`sess:${session.id}`); return null; }
      const r = await tokenRequest({ grant_type: "refresh_token", refresh_token: session.tokens.refreshToken });
      if (!r.ok) {
        if (r.error === "invalid_grant") { await store.delete(`sess:${session.id}`); return null; } // revoked or replayed: end the session
        throw new Error("Token refresh failed");
      }
      const next = { ...session, tokens: toTokens(r.body, now(), session.tokens) };
      await saveSession(next);
      return next;
    })().finally(() => inflight.delete(session.id));
    inflight.set(session.id, p);
    return p;
  }

  return {
    /** Route handler for `${basePath}/login|callback|session|logout`. Works with any Fetch-API runtime. */
    async handle(req: Request): Promise<Response> {
      const url = new URL(req.url);
      if (!url.pathname.startsWith(`${base}/`)) return text(404, "Not found");
      const route = url.pathname.slice(base.length + 1);
      try {
        if (route === "login" && req.method === "GET") return await login(url);
        if (route === "callback" && req.method === "GET") return await callback(req, url);
        if (route === "session" && req.method === "GET") {
          const s = await getSession(req);
          return s ? json(200, { authenticated: true, user: s.user, csrfToken: s.csrfToken, expiresAt: s.tokens.expiresAt }) : json(401, { authenticated: false });
        }
        if (route === "logout" && !SAFE.has(req.method)) {
          const s = await getSession(req);
          if (s) {
            if (!csrfOk(req, s)) return text(403, "Forbidden");
            await store.delete(`sess:${s.id}`);
          }
          return new Response(null, { status: 204, headers: { ...HEADERS, "set-cookie": clearCookie(SID, secure) } });
        }
        return text(404, "Not found");
      } catch {
        return text(500, "Internal error"); // details go to server logs, never to the client
      }
    },
    getSession,
    /** For server-side upstream calls: returns a fresh access token, refreshing and rotating if needed. */
    async getAccessToken(req: Request): Promise<string | null> {
      let s = await getSession(req);
      if (!s) return null;
      if (s.tokens.expiresAt - Math.floor(now() / 1000) <= skew) s = await refresh(s);
      return s?.tokens.accessToken ?? null;
    },
    /** Guard for your own state-changing routes. */
    async verifyCsrf(req: Request): Promise<boolean> {
      if (SAFE.has(req.method)) return true;
      const s = await getSession(req);
      return !!s && csrfOk(req, s);
    },
  };
}
