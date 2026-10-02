import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:4173";
const apiURL = process.env.E2E_API_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results",
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true,
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "npm run dev --workspace @atlas/api -- --host 127.0.0.1 --port 3000",
      url: `${apiURL}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        PAYMENT_PROVIDER: "demo",
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
      },
    },
    {
      command: "npm run dev --workspace @atlas/web -- --host 127.0.0.1 --port 4173",
      url: baseURL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_API_URL: apiURL,
        VITE_STRIPE_PUBLISHABLE_KEY: "",
      },
    },
  ],
});
