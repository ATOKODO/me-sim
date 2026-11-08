import fs from "node:fs";
import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { VISUAL_ORIGINS } from "../../config/test-origins";
import { REFERENCE_VIEWPORTS } from "../../config/viewports";
import { snapshotPath } from "./snapshot-path";

const origin = VISUAL_ORIGINS.documentation;
const pages = ["index", "getting-started"];
const guidePages = fs
  .readdirSync("docs")
  .filter((name) => name.endsWith(".md"))
  .sort();
/** @spec TECH-TOOLING-TESTS */
const path = (name: string) => "/" + (name === "index" ? "" : name);

for (const theme of ["dark", "light"])
  for (const [device, viewport] of Object.entries(REFERENCE_VIEWPORTS))
    for (const name of pages) {
      test(`docs / ${theme} / en / ${device} / ${name}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await prepare(page, theme);
        await page.goto(origin + path(name));
        await ready(page, name);
        await expect(page.locator("html")).toHaveClass(
          theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/,
        );
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        await expect(page).toHaveScreenshot(
          snapshotPath(
            "documentation",
            viewport.width,
            viewport.height,
            "en",
            theme,
            name + ".png",
          ),
          { fullPage: true },
        );
      });
    }

test("docs / en / every guide, legacy paths and local search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page, "light");
  const missing: string[] = [];
  page.on("response", (response) => {
    if (response.url().startsWith(origin + "/") && response.status() >= 400)
      missing.push(`${response.status()} ${response.url()}`);
  });
  for (const file of guidePages) {
    const name = file.slice(0, -3);
    await page.goto(origin + path(name));
    await ready(page, name);
    const invalid = await page
      .locator(".vp-doc .header-anchor")
      .evaluateAll(
        (anchors) =>
          anchors.filter(
            (a) =>
              !document.getElementById(
                decodeURIComponent(a.getAttribute("href")!.slice(1)),
              ),
          ).length,
      );
    expect(invalid).toBe(0);
    await page.goto(origin + "/en/" + (name === "index" ? "" : name));
    await ready(page, name);
  }
  await page.goto(origin + "/data-guide#profil-target");
  await expect(page.locator("#profil-target")).toContainText("Target profile");
  await page
    .getByRole("button", { name: "Search documentation", exact: true })
    .click();
  const input = page.locator("#localsearch-input");
  await input.fill("SQLite");
  const results = page.locator(".VPLocalSearchBox a.result");
  await expect(results.first()).toBeVisible();
  await results.first().click();
  await expect(input).not.toBeVisible();
  expect(missing).toEqual([]);
});
/** @spec TECH-TOOLING-TESTS */
async function prepare(page: Page, theme: string) {
  await page.addInitScript(
    (theme) => localStorage.setItem("vitepress-theme-appearance", theme),
    theme,
  );
}
/** @spec TECH-TOOLING-TESTS */
async function ready(page: Page, name: string) {
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  if (name === "index")
    await expect(page.locator(".VPHero .text")).toHaveText(
      "Your habits, your little world.",
    );
  else {
    const heading = fs
      .readFileSync(`docs/${name}.md`, "utf8")
      .match(/^# (.+?)(?: \{#[^}]+\})?\r?$/m)![1];
    await expect(page.locator(".vp-doc h1")).toContainText(heading);
  }
  await page.evaluate(() => document.fonts.ready);
}
