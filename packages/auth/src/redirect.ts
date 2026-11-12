/** Accept only same-origin relative paths. Anything else becomes "/" (open-redirect prevention). */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.includes("\\")) return "/";
  if (/[\u0000-\u001f]/.test(value)) return "/";
  try {
    const u = new URL(value, "https://placeholder.invalid");
    if (u.origin !== "https://placeholder.invalid") return "/";
  } catch { return "/"; }
  return value;
}
