import { createServer, type IncomingMessage, type Server } from "node:http";
import { exportJWK, generateKeyPair, SignJWT, type JWK, type CryptoKey } from "jose";
import { pkceChallenge, randomToken } from "../crypto";

export interface MockOidcOptions {
  clientId?: string;
  redirectUris?: string[];
  user?: { sub: string; name?: string; email?: string };
  accessTokenTtl?: number;
  /** Deliberately wrong ID tokens, for negative tests. */
  idToken?: { nonce?: string; aud?: string; iss?: string; expSeconds?: number; signWithOtherKey?: boolean };
}
interface CodeRec { challenge: string; nonce: string; redirectUri: string; used: boolean; family?: string }
interface Family { current: string; old: Set<string>; revoked: boolean }

/** Minimal in-process OIDC provider for tests. NOT secure, NOT for production. */
export async function startMockOidc(initial: MockOidcOptions = {}) {
  const opts: Required<Pick<MockOidcOptions, "clientId" | "redirectUris" | "user" | "accessTokenTtl">> & MockOidcOptions = {
    clientId: "demo-client", redirectUris: ["https://app.test/auth/callback"], user: { sub: "user-1", name: "Ada", email: "ada@example.com" }, accessTokenTtl: 300, ...initial,
  };
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const other = await generateKeyPair("RS256");
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const codes = new Map<string, CodeRec>();
  const families = new Map<string, Family>();
  const refreshToFamily = new Map<string, string>();
  const stats = { tokenRequests: { authorization_code: 0, refresh_token: 0 } as Record<string, number>, issued: [] as string[] };
  let issuer = "";

  async function idToken(sub: string, nonce: string) {
    const o = opts.idToken ?? {};
    const exp = Math.floor(Date.now() / 1000) + (o.expSeconds ?? 300);
    return new SignJWT({ nonce: o.nonce ?? nonce, name: opts.user.name, email: opts.user.email })
      .setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(o.iss ?? issuer).setAudience(o.aud ?? opts.clientId)
      .setSubject(sub).setIssuedAt().setExpirationTime(exp).sign((o.signWithOtherKey ? other.privateKey : privateKey) as CryptoKey);
  }
  function issue(familyId: string, nonce?: string) {
    const refresh = randomToken();
    const fam = families.get(familyId)!;
    if (fam.current) fam.old.add(fam.current);
    fam.current = refresh; refreshToFamily.set(refresh, familyId);
    const access = randomToken();
    stats.issued.push(access, refresh);
    return { access, refresh, nonce };
  }
  const body = (req: IncomingMessage) => new Promise<URLSearchParams>((res) => { let s = ""; req.on("data", (c) => (s += c)); req.on("end", () => res(new URLSearchParams(s))); });
  const send = (res: import("node:http").ServerResponse, status: number, data: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url!, issuer);
    if (url.pathname === "/.well-known/openid-configuration")
      return send(res, 200, { issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks` });
    if (url.pathname === "/jwks") return send(res, 200, { keys: [jwk] });
    if (url.pathname === "/authorize") {
      const q = url.searchParams;
      if (q.get("client_id") !== opts.clientId || !opts.redirectUris.includes(q.get("redirect_uri") ?? "")) return send(res, 400, { error: "invalid_request" });
      if (q.get("code_challenge_method") !== "S256" || !q.get("code_challenge")) return send(res, 400, { error: "invalid_request", error_description: "PKCE S256 required" });
      const code = randomToken();
      codes.set(code, { challenge: q.get("code_challenge")!, nonce: q.get("nonce") ?? "", redirectUri: q.get("redirect_uri")!, used: false });
      const to = new URL(q.get("redirect_uri")!); to.searchParams.set("code", code); to.searchParams.set("state", q.get("state") ?? "");
      res.writeHead(302, { location: to.toString() }); return res.end();
    }
    if (url.pathname === "/token" && req.method === "POST") {
      const p = await body(req);
      const grant = p.get("grant_type") ?? "";
      stats.tokenRequests[grant] = (stats.tokenRequests[grant] ?? 0) + 1;
      if (grant === "authorization_code") {
        const rec = codes.get(p.get("code") ?? "");
        if (!rec) return send(res, 400, { error: "invalid_grant" });
        if (rec.used) { if (rec.family) families.get(rec.family)!.revoked = true; return send(res, 400, { error: "invalid_grant" }); } // code replay revokes issued tokens
        rec.used = true;
        if (p.get("redirect_uri") !== rec.redirectUri || (await pkceChallenge(p.get("code_verifier") ?? "")) !== rec.challenge) return send(res, 400, { error: "invalid_grant" });
        const familyId = randomToken(); families.set(familyId, { current: "", old: new Set(), revoked: false }); rec.family = familyId;
        const t = issue(familyId);
        return send(res, 200, { access_token: t.access, refresh_token: t.refresh, id_token: await idToken(opts.user.sub, rec.nonce), expires_in: opts.accessTokenTtl, token_type: "Bearer" });
      }
      if (grant === "refresh_token") {
        const rt = p.get("refresh_token") ?? "";
        const fid = refreshToFamily.get(rt); const fam = fid ? families.get(fid) : undefined;
        if (!fam || fam.revoked) return send(res, 400, { error: "invalid_grant" });
        if (fam.old.has(rt)) { fam.revoked = true; return send(res, 400, { error: "invalid_grant" }); } // reuse of a rotated token: revoke the family
        if (fam.current !== rt) return send(res, 400, { error: "invalid_grant" });
        const t = issue(fid!);
        return send(res, 200, { access_token: t.access, refresh_token: t.refresh, expires_in: opts.accessTokenTtl, token_type: "Bearer" });
      }
      return send(res, 400, { error: "unsupported_grant_type" });
    }
    send(res, 404, { error: "not_found" });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  issuer = `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}`;

  return {
    issuer, options: opts, stats,
    /** Simulates the user approving: follows /authorize and returns the callback URL with code and state. */
    async authorize(authorizeUrl: string): Promise<string> {
      const r = await fetch(authorizeUrl, { redirect: "manual" });
      const loc = r.headers.get("location");
      if (!loc) throw new Error(`authorize failed: ${r.status}`);
      return loc;
    },
    /** Replays a refresh token directly at the IdP (simulates a stolen, already-rotated token). */
    async replayRefresh(token: string) {
      return fetch(`${issuer}/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token, client_id: opts.clientId }) });
    },
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
