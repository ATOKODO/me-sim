import { defineConfig } from "@playwright/test";
import { VISUAL_ORIGINS } from "./config/test-origins";
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
    contextOptions: { reducedMotion: "reduce" },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium" }],
  webServer: process.env.ME_SIM_VISUAL_SERVERS_MANAGED
    ? []
    : [
        {
          command: "node scripts/serve-docs.mjs",
          url: VISUAL_ORIGINS.documentation,
          env: { ME_SIM_DOCS_PORT: new URL(VISUAL_ORIGINS.documentation).port },
          reuseExistingServer: false,
          timeout: 20000,
        },
        {
          command: "node scripts/serve-storybook.mjs",
          url: VISUAL_ORIGINS.storybook,
          reuseExistingServer: false,
          timeout: 20000,
        },
        {
          command: "node scripts/serve.mjs",
          url: VISUAL_ORIGINS.application,
          env: {
            ME_SIM_PREVIEW_PORT: new URL(VISUAL_ORIGINS.application).port,
          },
          reuseExistingServer: false,
          timeout: 20000,
        },
      ],
});
