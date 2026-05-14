import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env["MIRROR_BASE_URL"]?.trim() ||
  process.env["PLAYWRIGHT_BASE_URL"]?.trim() ||
  "http://127.0.0.1:5204";
const webServerUrl = new URL(baseURL);
const webServerPort = webServerUrl.port || "5204";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.mjs",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  workers: 1,
  reporter: [["line"], ["html", { outputFolder: "./reports/e2e" }]],
  webServer: {
    command: `node --max-old-space-size=4096 ../../node_modules/next/dist/bin/next start -p ${webServerPort} -H 127.0.0.1`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: false,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
