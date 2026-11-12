import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const stories = ["kit--buttons", "kit--inputs", "kit--selects", "kit--dialog-example", "kit--toasts"];
const open = (page: import("@playwright/test").Page, id: string, theme: string) =>
  page.goto(`/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`).then(async () => {
    await page.locator("#storybook-root > *").first().waitFor();
    // The Storybook decorator applies the theme in an effect; wait for it so axe and screenshots see the right palette.
    await page.waitForFunction((t) => document.documentElement.getAttribute("data-theme") === t, theme);
  });

for (const theme of ["light", "dark"]) {
  for (const id of stories) {
    // Real browser axe run, including colour contrast that jsdom cannot evaluate.
    test(`axe: ${id} (${theme})`, async ({ page }) => {
      await open(page, id, theme);
      const results = await new AxeBuilder({ page }).include("#storybook-root").analyze();
      expect(results.violations).toEqual([]);
    });
    // Visual regression. Baselines are per platform; see docs/a11y.md and ADR 0003.
    test(`visual: ${id} (${theme})`, { tag: "@visual" }, async ({ page }) => {
      await open(page, id, theme);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${id}-${theme}.png`);
    });
  }
}

test("dialog: focus trap, Esc closes, focus returns to opener", async ({ page }) => {
  await open(page, "kit--dialog-example", "light");
  const opener = page.getByRole("button", { name: "Open dialog" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete item" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    // Focus may leave to browser chrome (body) but must never land on the inert page behind the dialog.
    expect(await page.evaluate(() => { const a = document.activeElement; return a === document.body || !!a?.closest("dialog"); })).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("dialog: clicking inside the dialog (including its padding) does not close it; clicking the backdrop does", async ({ page }) => {
  await open(page, "kit--dialog-example", "light");
  await page.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete item" });
  const box = (await dialog.boundingBox())!;
  await page.mouse.click(box.x + 4, box.y + 4); // inside the dialog's padding
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2); // backdrop
  await expect(dialog).toBeHidden();
});

test("toast: error toast lands in the alert region and persists", async ({ page }) => {
  await open(page, "kit--toasts", "light");
  await page.getByRole("button", { name: "Error toast" }).click();
  await expect(page.getByRole("alert")).toContainText("Upload failed");
  await page.waitForTimeout(6000);
  await expect(page.getByRole("alert")).toContainText("Upload failed");
});

test("theme: data-theme=dark changes the surface colour", async ({ page }) => {
  await open(page, "kit--buttons", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.body.firstElementChild!).getPropertyValue("--kit-color-bg").trim());
  expect(bg).toBe("#0f1219");
});
