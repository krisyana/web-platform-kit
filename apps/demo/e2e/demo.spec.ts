import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home renders under a strict CSP with no violations and no console errors", async ({ page }) => {
  const problems: string[] = [];
  // 401 = expected anonymous /session probe
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("401")) problems.push(m.text()); });
  page.on("pageerror", (e) => problems.push(e.message));
  const res = await page.goto("/");
  const csp = res!.headers()["content-security-policy"]!;
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).not.toContain("unsafe-inline");
  await expect(page.getByRole("heading", { name: "Web Platform Kit demo" })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.getByRole("button", { name: "Open dialog" }).click();
  await expect(page.getByRole("dialog", { name: "Confirm" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("home has no axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sign in")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("login, protected page, token-free browser, CSRF-protected logout", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByTestId("account-name")).toHaveText("Ada Lovelace"); // full OIDC code+PKCE round trip against the mock IdP
  const cookies = await context.cookies();
  const sid = cookies.find((c) => c.name.endsWith("kit_sid"))!;
  expect(sid.httpOnly).toBe(true); expect(sid.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("kit_sid"); // invisible to JS
  const html = await page.content();
  expect(html).not.toMatch(/access_token|refresh_token|id_token/);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).toBe("{}");
  // CSRF: a request without the token is refused and keeps the session
  expect((await page.request.post("/api/auth/logout", { headers: { origin: "http://localhost:3000" } })).status()).toBe(403);
  await page.goto("/");
  await expect(page.getByTestId("user")).toHaveText("Ada Lovelace");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
});

test("telemetry: fetch spans, logs and web vitals reach the collector routes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Sign in")).toBeVisible();
  await page.evaluate(() => { // pages report vitals when hidden
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(async () => {
    await page.waitForTimeout(500);
    const text = (await (await page.request.get("/telemetry")).text()).replace(/<!-- -->/g, "");
    expect(text).toMatch(/[1-9]\d* spans?/); expect(text).toMatch(/[1-9]\d* logs?/); expect(text).toMatch(/[1-9]\d* vitals?/);
  }).toPass({ timeout: 15_000 });
});
