import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled" } },
  use: { baseURL: "http://localhost:6007", colorScheme: "light" },
  webServer: { command: "pnpm exec sirv storybook-static --port 6007 --quiet", url: "http://localhost:6007", reuseExistingServer: !process.env.CI },
});
