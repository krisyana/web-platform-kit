import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  workers: 1,
  webServer: [
    { command: "pnpm idp", url: "http://127.0.0.1:4010/.well-known/openid-configuration", reuseExistingServer: !process.env.CI },
    { command: "pnpm build && pnpm start", url: "http://localhost:3000", timeout: 180_000, reuseExistingServer: !process.env.CI },
  ],
});
