import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { VISUAL_ORIGINS } from "../../config/test-origins";
import { REFERENCE_VIEWPORTS } from "../../config/viewports";
import { ENGLISH } from "../../src/app/core/translations";
const routes = [
  {
    name: "dashboard",
    route: "/",
    link: "Mon aperçu",
    heading: "Un peu plus toi, chaque jour",
  },
  {
    name: "journal",
    route: "/journal",
    link: "Mon journal",
    heading: "Mon journal",
  },
  {
    name: "habits",
    route: "/habitudes",
    link: "Mes habitudes",
    heading: "Mes habitudes",
  },
  {
    name: "futures",
    route: "/futurs",
    link: "Mes futurs",
    heading: "Mes futurs possibles",
  },
  {
    name: "profiles",
    route: "/profils",
    link: "Mes profils",
    heading: "Mes profils",
  },
  {
    name: "data",
    route: "/donnees",
    link: "Mes données",
    heading: "Mes données",
  },
  {
    name: "settings",
    route: "/parametres",
    link: "Préférences",
    heading: "Préférences",
  },
];
for (const theme of ["dark", "light"])
  for (const width of [960, 1440])
    for (const route of routes) {
      test(theme + " / " + width + " / " + route.name, async ({ page }) => {
        await prepare(page, theme, "fr", width);
        await navigate(page, route, "fr");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page).toHaveScreenshot(
          "app-" + route.name + "-" + theme + "-" + width + ".png",
          { fullPage: true },
        );
      });
    }
for (const theme of ["dark", "light"])
  for (const route of routes.filter((r) =>
    ["dashboard", "journal", "habits"].includes(r.name),
  )) {
    test(theme + " / English / " + route.name, async ({ page }) => {
      await prepare(page, theme, "en", 1440);
      await navigate(page, route, "en");
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page).toHaveScreenshot(
        "app-" + route.name + "-" + theme + "-en.png",
        { fullPage: true },
      );
    });
  }
for (const theme of ["dark", "light"])
  for (const language of ["fr", "en"])
    for (const [device, viewport] of Object.entries(REFERENCE_VIEWPORTS))
      for (const route of routes) {
        test(
          "devices / " +
            theme +
            " / " +
            language +
            " / " +
            device +
            " / " +
            route.name,
          async ({ page }) => {
            await prepare(
              page,
              theme,
              language,
              viewport.width,
              viewport.height,
            );
            await navigate(page, route, language);
            await expect(page.locator("html")).toHaveAttribute(
              "lang",
              language,
            );
            await expect(page.locator("html")).toHaveAttribute(
              "data-theme",
              theme,
            );
            expect(
              await page.evaluate(() => ({
                width: innerWidth,
                height: innerHeight,
              })),
            ).toEqual({ width: viewport.width, height: viewport.height });
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth),
            ).toBeLessThanOrEqual(viewport.width);
            await expect(page).toHaveScreenshot(
              "app-" +
                route.name +
                "-" +
                theme +
                "-" +
                language +
                "-" +
                device +
                ".png",
              { fullPage: true },
            );
          },
        );
      }
async function navigate(
  page: Page,
  route: (typeof routes)[number],
  language: string,
) {
  const translated = (source: string) =>
    language === "en" ? (ENGLISH[source] ?? source) : source;
  await page
    .getByRole("link", { name: translated(route.link), exact: true })
    .click();
  await expect(page.locator("h1")).toContainText(translated(route.heading));
  const scenes = page.locator("avatar-scene");
  for (const scene of await scenes.all()) {
    await expect(scene).toContainText(translated("ANIMATION GLB"));
    await expect(scene.locator(".camera-controls")).toBeVisible();
  }
  // Hide the GPU pixels only: camera controls, captions and the scene layout remain in the reference.
  // Functional tests exercise the actual rendered model, animation and camera independently.
  await page.locator("avatar-scene canvas").evaluateAll((canvases) => {
    for (const canvas of canvases)
      (canvas as HTMLCanvasElement).style.visibility = "hidden";
  });
  await page.evaluate(() => document.fonts.ready);
}
async function prepare(
  page: Page,
  theme: string,
  language: string,
  width: number,
  height = 1000,
) {
  await page.setViewportSize({ width, height });
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00Z"));
  await page.addInitScript(
    ({ theme, language }) => {
      localStorage.setItem(
        "me-sim.appearance.v1",
        JSON.stringify({ theme, language }),
      );
    },
    { theme, language },
  );
  // Browser demo only; changing routes must retain in-memory presentation settings.
  await page.goto(VISUAL_ORIGINS.application + "/#/parametres");
  await expect(page.locator("h1")).toBeVisible();
  const checkboxes = page.locator("input[type=checkbox]");
  // Make the confirmation deterministic even when reduced motion starts animations off.
  await checkboxes.nth(0).check();
  const confirmation = "Aperçu mis à jour · données temporaires.";
  const notice = language === "en" ? ENGLISH[confirmation] : confirmation;
  await expect(page.getByRole("status")).toContainText(notice);
  await checkboxes.nth(0).uncheck();
  await expect(page.getByRole("status")).toContainText(notice);
  await checkboxes.nth(1).uncheck();
  await expect(checkboxes).toHaveCount(2);
  await expect(checkboxes.nth(0)).not.toBeChecked();
  await expect(checkboxes.nth(1)).not.toBeChecked();
}
