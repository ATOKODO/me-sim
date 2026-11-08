import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { VISUAL_ORIGINS } from "../../config/test-origins";
import { REFERENCE_VIEWPORTS } from "../../config/viewports";
import { snapshotPath } from "./snapshot-path";

type CompanionViewport = "iphone16pro" | "ipadpro11";
const viewports: CompanionViewport[] = ["iphone16pro", "ipadpro11"];

/** @spec TECH-TOOLING-TESTS */
async function prepare(page: Page, viewportName: CompanionViewport) {
  const viewport = REFERENCE_VIEWPORTS[viewportName];
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00+02:00"));
  await page.goto(VISUAL_ORIGINS.companion + "/companion/");
  await expect(page.locator("#pair-panel")).toBeVisible();
  await expect(page.locator("#connection")).toHaveText("PC non connecté");
}

/** @spec TECH-TOOLING-TESTS */
async function pair(page: Page) {
  await page.getByLabel("Nom de cet appareil").fill("Téléphone de Camille");
  await page.getByLabel("Code d’association").fill("123456");
  await page.getByRole("button", { name: "Associer", exact: true }).click();
  await expect(page.locator("#capture-panel")).toBeVisible();
  await expect(page.locator("#connection")).toHaveText("PC connecté");
  await expect(page.locator("#message")).toHaveText(
    "Téléphone associé. Tu peux maintenant saisir des données hors ligne.",
  );
}

/** @spec TECH-TOOLING-TESTS */
async function capture(
  page: Page,
  viewportName: CompanionViewport,
  screenName: string,
) {
  const viewport = REFERENCE_VIEWPORTS[viewportName];
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(
    snapshotPath(
      "companion",
      viewport.width,
      viewport.height,
      "fr",
      "dark",
      `${screenName}.png`,
    ),
    { fullPage: true },
  );
}

for (const viewportName of viewports) {
  const viewport = REFERENCE_VIEWPORTS[viewportName];
  test(`companion / ${viewport.name} / association`, async ({ page }) => {
    await prepare(page, viewportName);
    await capture(page, viewportName, "pairing");
  });

  test(`companion / ${viewport.name} / measurement`, async ({ page }) => {
    await prepare(page, viewportName);
    await pair(page);
    await page.locator("#value").fill("72.5");
    await capture(page, viewportName, "measurement");
  });

  test(`companion / ${viewport.name} / offline habit`, async ({ page }) => {
    await prepare(page, viewportName);
    await pair(page);
    await page.context().setOffline(true);
    await expect(page.locator("#connection")).toHaveText("Hors ligne");
    await page.locator("#tab-habit").click();
    await page.getByRole("button", { name: "Marcher 20 minutes : Oui" }).click();
    await expect(page.locator("#pending-badge")).toHaveText("1 en attente");
    await expect(page.locator("#queue-list")).toContainText("Habitude · Oui");
    await capture(page, viewportName, "offline-habit");
  });
}
