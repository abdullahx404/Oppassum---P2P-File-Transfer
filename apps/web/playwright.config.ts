import { defineConfig, devices } from "@playwright/test";

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3400",
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
    trace: "on-first-retry"
  },
  webServer: [
    {
      command:
        "cmd /c \"set PORT=4100&& set CLIENT_ORIGIN=http://127.0.0.1:3400&& npm run dev --workspace @oppassum/signaling\"",
      url: "http://127.0.0.1:4100/health",
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      command:
        "cmd /c \"set NEXT_PUBLIC_SIGNALING_URL=http://127.0.0.1:4100&& npm run dev --workspace @oppassum/web -- --hostname 127.0.0.1 --port 3400\"",
      url: "http://127.0.0.1:3400",
      reuseExistingServer: false,
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
