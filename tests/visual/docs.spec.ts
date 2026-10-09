import fs from "node:fs";
import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";
import { VISUAL_ORIGINS } from "../../config/test-origins";
import { REFERENCE_VIEWPORTS } from "../../config/viewports";

const origin = VISUAL_ORIGINS.documentation;
const pages = ["index", "getting-started"];
const guidePages = fs
  .readdirSync("docs")
  .filter((name) => name.endsWith(".md"))
  .sort();
const homeText = {
  fr: "Tes habitudes, ton petit monde.",
  en: "Your habits, your little world.",
};
const path = (language: string, name: string) =>
  (language === "en" ? "/en/" : "/") + (name === "index" ? "" : name);

for (const theme of ["dark", "light"])
  for (const language of ["fr", "en"] as const)
    for (const [device, viewport] of Object.entries(REFERENCE_VIEWPORTS))
      for (const name of pages) {
        test(`docs / ${theme} / ${language} / ${device} / ${name}`, async ({
          page,
        }) => {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await prepare(page, theme);
          await page.goto(origin + path(language, name));
          await ready(page, language, name);
          await expect(page.locator("html")).toHaveClass(
            theme === "dark" ? /dark/ : /^(?!.*\bdark\b)/,
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
            `docs-${name}-${theme}-${language}-${device}.png`,
            { fullPage: true },
          );
        });
      }

for (const language of ["fr", "en"] as const) {
  test(`docs / ${language} / every guide, language switch and local search`, async ({
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
      await page.goto(origin + path(language, name));
      await ready(page, language, name);
      const ids = await page
        .locator(".vp-doc .header-anchor")
        .evaluateAll((anchors) =>
          anchors.map((a) => ({
            href: a.getAttribute("href"),
            exists: !!document.getElementById(
              decodeURIComponent(a.getAttribute("href")!.slice(1)),
            ),
          })),
        );
      expect(ids.filter((anchor) => !anchor.exists)).toEqual([]);
      if (language === "en") {
        const links = await page
          .locator(".vp-doc a[href]")
          .evaluateAll((anchors) =>
            anchors.map((a) => (a as HTMLAnchorElement).href),
          );
        for (const link of links) {
          const url = new URL(link);
          if (url.origin === origin && !/\.(?:png|svg)$/.test(url.pathname))
            expect(url.pathname).toMatch(/^\/en\//);
        }
      }
    }
    const section = "#profil-target";
    await page.goto(origin + path(language, "data-guide") + section);
    const other = language === "fr" ? "en" : "fr";
    await page
      .getByRole("button", {
        name: language === "fr" ? "Changer de langue" : "Change language",
        exact: true,
      })
      .click();
    await page
      .locator(".VPNavBarTranslations")
      .getByRole("link", {
        name: other === "en" ? "English" : "Français",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(origin + path(other, "data-guide") + section);
    await expect(page.locator("#profil-target")).toContainText(
      other === "en" ? "Target profile" : "Profil Target",
    );
    await page
      .getByRole("button", {
        name: other === "fr" ? "Changer de langue" : "Change language",
        exact: true,
      })
      .click();
    await page
      .locator(".VPNavBarTranslations")
      .getByRole("link", {
        name: language === "en" ? "English" : "Français",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      origin + path(language, "data-guide") + section,
    );
    await page
      .getByRole("button", {
        name:
          language === "en"
            ? "Search documentation"
            : "Rechercher dans la documentation",
        exact: true,
      })
      .click();
    const input = page.locator("#localsearch-input");
    await input.fill("SQLite");
    const results = page.locator(".VPLocalSearchBox a.result");
    await expect(results.first()).toBeVisible();
    for (const href of await results.evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).pathname),
    ))
      expect(href.startsWith("/en/")).toBe(language === "en");
    await results.first().click();
    await expect(input).not.toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      language === "en" ? "en-US" : "fr-FR",
    );
    // The language menu must also work when the desktop navigation is hidden.
    const current = new URL(page.url());
    await page.setViewportSize({
      width: REFERENCE_VIEWPORTS.iphone16pro.width,
      height: REFERENCE_VIEWPORTS.iphone16pro.height,
    });
    await page
      .getByRole("button", { name: "mobile navigation", exact: true })
      .click();
    await page
      .locator(".VPNavScreenTranslations")
      .getByRole("link", {
        name: other === "en" ? "English" : "Français",
        exact: true,
      })
      .click();
    const destination =
      other === "en"
        ? "/en" + current.pathname
        : current.pathname.replace(/^\/en\//, "/");
    await expect(page).toHaveURL(origin + destination + current.hash);
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      other === "en" ? "en-US" : "fr-FR",
    );
    expect(missing).toEqual([]);
  });
}
async function prepare(page: Page, theme: string) {
  await page.addInitScript(
    (theme) => localStorage.setItem("vitepress-theme-appearance", theme),
    theme,
  );
}
async function ready(page: Page, language: "fr" | "en", name: string) {
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    language === "en" ? "en-US" : "fr-FR",
  );
  if (name === "index")
    await expect(page.locator(".VPHero .text")).toHaveText(homeText[language]);
  else {
    const file = `docs/${language === "en" ? "en/" : ""}${name}.md`;
    const heading = fs
      .readFileSync(file, "utf8")
      .match(/^# (.+?)(?: \{#[^}]+\})?\r?$/m)![1];
    await expect(page.locator(".vp-doc h1")).toContainText(heading);
  }
  await page.evaluate(() => document.fonts.ready);
}
