import { defineConfig, devices } from "@playwright/test";

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3200",
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "npm run dev --workspace @oppassum/signaling",
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "npm run dev --workspace @oppassum/web -- --hostname 127.0.0.1 --port 3200",
      url: "http://127.0.0.1:3200",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ],
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }
    }
  ]
});
