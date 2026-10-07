import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/visual",
  outputDir: "test-results/visual",
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{platform}/{projectName}/{arg}{ext}",
  updateSnapshots: "none",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/visual", open: "never" }],
  ],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixels: 100,
      threshold: 0.15,
    },
  },
  use: {
    browserName: "chromium",
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: [
    {
      command: "node scripts/serve-storybook.mjs",
      url: "http://127.0.0.1:6107",
      reuseExistingServer: false,
      timeout: 20000,
    },
    {
      command: "node scripts/serve.mjs",
      url: "http://127.0.0.1:1422",
      env: { ME_SIM_PREVIEW_PORT: "1422" },
      reuseExistingServer: false,
      timeout: 20000,
    },
  ],
});
