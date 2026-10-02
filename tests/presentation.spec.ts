import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const cache = "me-sim.appearance.v1";
const routes = [
  "/",
  "/journal",
  "/habitudes",
  "/futurs",
  "/profils",
  "/donnees",
  "/parametres",
];
const englishHeadings = [
  "A little more you, every day",
  "My journal",
  "My habits",
  "My possible futures",
  "My profiles",
  "My data",
  "Preferences",
];

test("language and theme switch live, preserve inputs and persist presentation only", async ({
  page,
}) => {
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:1421")
      external.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/profils");
  await page.getByLabel("Prénom ou pseudonyme").fill("Language test");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await page.getByLabel("Valeur · kg").fill("71.8");
  await page.getByLabel("Langue", { exact: true }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("Value · kg")).toHaveValue("71.8");
  await page
    .getByRole("button", { name: "Add to journal", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "71.8 kg", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Preview updated");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("light");
  await expect(page.getByLabel("Preferences language")).toHaveValue("en");
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), cache),
  ).toEqual({ language: "en", theme: "light" });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page.getByLabel("Preferences language").selectOption("fr");
  await expect(
    page.getByRole("heading", { name: "Préférences." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

for (const language of ["en", "fr"]) {
  test(`${language} light theme is readable on every route at Windows minimum width`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.addInitScript(
      ({ cache, language }) =>
        localStorage.setItem(
          cache,
          JSON.stringify({ language, theme: "light" }),
        ),
      { cache, language },
    );
    await page.setViewportSize({ width: 960, height: 900 });
    for (const [index, route] of routes.entries()) {
      await page.goto("/#" + route);
      await expect(page.locator("h1")).toBeVisible();
      if (language === "en")
        await expect(page.locator("h1")).toContainText(englishHeadings[index]);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        route,
      ).toEqual([]);
      if (route === "/" || route === "/parametres" || route === "/habitudes")
        await page.screenshot({
          path: `test-results/${language}-light-${route.replaceAll("/", "") || "dashboard"}.png`,
          fullPage: true,
        });
    }
  });
}

test("English habit calendar and dialogs preserve custom French names", async ({
  page,
}) => {
  await page.goto("/#/profils");
  await page.getByLabel("Prénom ou pseudonyme").fill("Mes habitudes");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await page.getByLabel("Langue", { exact: true }).selectOption("en");
  await page.getByRole("link", { name: "My habits", exact: true }).click();
  await page.getByLabel("Habit name").fill("Tabac");
  await page.getByRole("button", { name: "Add to tracking" }).click();
  await expect(page.locator(".habit-check-name strong")).toHaveText("Tabac");
  await expect(page.locator(".habit-weekday")).toHaveText([
    "M",
    "T",
    "W",
    "T",
    "F",
    "S",
    "S",
  ]);
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await page.getByRole("button", { name: "Validate day", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Validated day", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My profiles", exact: true }).click();
  const profile = page
    .locator(".profile-card")
    .filter({ hasText: "Mes habitudes" });
  await profile
    .getByRole("button", { name: "Delete Mes habitudes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Delete Mes habitudes ?",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByLabel("Active profile").locator("option:checked"),
  ).toHaveText("Mes habitudes");
});

test("malformed presentation cache falls back safely", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "null"), cache);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Langue", { exact: true })).toHaveValue("fr");
});
test("native import, conflict and restore screens translate without rewriting file content", async ({
  page,
}) => {
  await page.addInitScript(
    ({ cache }) => {
      localStorage.setItem(
        cache,
        JSON.stringify({ language: "fr", theme: "dark" }),
      );
      const snapshot = {
        version: 1,
        profiles: [
          {
            id: "p",
            name: "Mes habitudes",
            birthDate: null,
            sex: null,
            heightCm: null,
            color: "#bde883",
            demo: false,
            target: null,
            habits: [],
          },
        ],
        observations: [],
        habitDays: [],
        batches: [],
        scenarios: [],
        runs: [],
        settings: {
          animations: false,
          jitter: false,
          force2d: true,
          language: "en",
          theme: "light",
        },
      };
      const row = {
        id: "o",
        profileId: "p",
        date: "2026-09-30",
        metric: "tobacco",
        value: 2,
        unit: "cigarette",
        source: "Écran.csv",
        batchId: null,
      };
      (window as any).isTauri = true;
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (command: string, args: any) => {
          if (command === "initial_state")
            return {
              snapshot: structuredClone(snapshot),
              revision: 0,
              storagePath: "C:\\Local\\Mes habitudes\\me-sim.db",
              model: {
                id: "hall-2011",
                version: "0.1.0",
                name: "Hall · NIDDK (2011)",
                status: "validation_pending",
                enabled: false,
                reasons: [
                  "La licence de redistribution du modèle complet et son domaine d’utilisation doivent être confirmés.",
                ],
                source: "",
                horizons: [],
              },
            };
          if (command === "choose_import")
            return {
              token: "book",
              filename: "Écran.csv",
              sheets: [
                {
                  name: "Sommeil",
                  headers: ["Date", "Tabac"],
                  rows: [["30/09/2026", "2"]],
                },
              ],
            };
          if (command === "preview_import")
            return {
              token: "preview",
              profileId: "p",
              filename: "Écran.csv",
              rows: [
                {
                  row: 2,
                  observation: row,
                  status: "new",
                  message: "Prêt à importer.",
                },
                {
                  row: 3,
                  observation: row,
                  status: "conflict",
                  message: "Valeur différente pour cette date et cette mesure.",
                },
                {
                  row: 4,
                  observation: null,
                  status: "error",
                  message: "Date invalide pour le format choisi.",
                },
              ],
            };
          if (command === "preview_restore")
            return {
              token: "restore",
              profiles: ["Mes habitudes"],
              observations: 1,
              habitDays: 0,
              scenarios: 0,
            };
          if (command === "mutate") {
            snapshot.settings = args.operation.value;
            return {
              snapshot: structuredClone(snapshot),
              revision: args.expectedRevision + 1,
            };
          }
          throw {
            code: "INVALID",
            message: "Version de sauvegarde non prise en charge.",
          };
        },
      };
    },
    { cache },
  );
  await page.goto("/#/donnees");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Choose a file", exact: true })
    .click();
  await expect(page.getByText("Écran.csv", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Sheet").locator("option:checked"),
  ).toContainText("Sommeil");
  await expect(
    page.getByLabel("Date column").locator("option").nth(1),
  ).toHaveText("Tabac");
  await page.getByLabel("Date format").selectOption({ label: "DD/MM/YYYY" });
  await page.getByRole("combobox", { name: /^Fixed unit/ }).selectOption("kg");
  await page.getByRole("button", { name: "Check rows", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Ready to import.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "Invalid date for the selected format.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "Different value for this date and metric.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Tobacco", exact: true }),
  ).toHaveCount(2);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Choose a backup", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Replace the entire local space?",
  );
  await expect(page.getByRole("dialog")).toContainText("Mes habitudes");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", {
      name: "Back up the whole space (.json)",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Unsupported backup version.",
  );
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await expect(
    page.getByRole("cell", { name: "Prêt à importer.", exact: true }),
  ).toBeVisible();
});
test("changing presentation preserves unsaved target and scenario drafts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Sommeil cible (h)").fill("8.5");
  await page.getByLabel("Langue", { exact: true }).selectOption("en");
  await expect(page.getByLabel("Target sleep (h)")).toHaveValue("8.5");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.getByLabel("Target sleep (h)")).toHaveValue("8.5");
  await page.getByRole("link", { name: "My futures", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Mes habitudes");
  await page
    .getByLabel("Intake change (kcal/day)", { exact: true })
    .fill("-125");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
    "Mes habitudes",
  );
  await expect(
    page.getByLabel("Variation d’apports (kcal/j)", { exact: true }),
  ).toHaveValue("-125");
});
