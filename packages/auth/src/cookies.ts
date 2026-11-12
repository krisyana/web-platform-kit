export interface CookieOptions { maxAge?: number; secure: boolean }

export function serializeCookie(name: string, value: string, o: CookieOptions): string {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (o.secure) parts.push("Secure");
  if (o.maxAge !== undefined) parts.push(`Max-Age=${o.maxAge}`);
  return parts.join("; "); // no Domain attribute: required by the __Host- prefix and keeps the cookie host-only
}
export const clearCookie = (name: string, secure: boolean) => serializeCookie(name, "", { maxAge: 0, secure });

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
