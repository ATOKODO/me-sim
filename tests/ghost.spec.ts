import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ timezoneId: "UTC" });
async function profile(page: Page) {
  await page.clock.install({ time: new Date("2026-10-21T18:40:00Z") });
  await page.goto("/#/profils");
  await page.getByLabel("Prénom ou pseudonyme").fill("Camille");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
}
test("ghost sessions feed the journal and linked habits, survive navigation and isolate profiles", async ({
  page,
}) => {
  await profile(page);
  await page.getByRole("link", { name: "Mes habitudes", exact: true }).click();
  await page
    .getByLabel("Choisir un exemple d’habitude")
    .selectOption("exercise");
  await page.getByRole("button", { name: "Ajouter au suivi" }).click();
  await page.getByRole("link", { name: "Mon fantôme", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Habitude liée (facultative)", exact: true })
    .selectOption({ label: "Sport / entraînement" });
  await page.getByRole("button", { name: "Je commence maintenant" }).click();
  await expect(
    page.getByRole("button", { name: "Terminer et enregistrer" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Mes habitudes", exact: true })
    .last()
    .click();
  await page.getByRole("link", { name: "Mon fantôme", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Terminer et enregistrer" }),
  ).toBeVisible();
  await page.clock.fastForward(10 * 60000);
  await expect(page.locator(".scene")).toHaveAttribute("data-mode", "exercise");
  await page.getByRole("button", { name: "Terminer et enregistrer" }).click();
  await expect(
    page.getByRole("button", { name: "Je commence maintenant" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Journal détaillé" }).click();
  await expect(
    page.getByRole("cell", { name: /Sport \/ entraînement/ }).first(),
  ).toBeVisible();
  const quantity = await page
    .locator("tbody tr")
    .filter({ hasText: "Sport / entraînement" })
    .first()
    .locator(".numeric")
    .innerText();
  expect(parseFloat(quantity.replace(",", "."))).toBeCloseTo(10, 0);
  await page.getByRole("link", { name: "Mes habitudes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Oui", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Valider la journée" }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Mon fantôme", exact: true }).click();
  await page.getByRole("button", { name: "Je commence maintenant" }).click();
  await page.getByText("Noter un événement ponctuel", { exact: true }).click();
  await page.getByLabel("Quantité", { exact: true }).fill("7");
  await page.getByLabel("Profil actif").selectOption({ label: "Alex · Démo" });
  await expect(page.getByLabel("Quantité", { exact: true })).toHaveValue("1");
  await expect(
    page.getByRole("button", { name: "Je commence maintenant" }),
  ).toBeVisible();
  await page.getByLabel("Profil actif").selectOption({ label: "Camille" });
  await expect(
    page.getByRole("button", { name: "Terminer et enregistrer" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abandonner la session", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmer l’abandon" }).click();
  await expect(
    page.getByRole("button", { name: "Je commence maintenant" }),
  ).toBeVisible();
});
test("a negative point links to its habit and keeps the day unvalidated", async ({
  page,
}) => {
  await profile(page);
  await page.getByRole("link", { name: "Mes habitudes", exact: true }).click();
  await page
    .getByLabel("Choisir un exemple d’habitude")
    .selectOption("tobacco");
  await page.getByRole("button", { name: "Ajouter au suivi" }).click();
  await page.getByRole("link", { name: "Mon fantôme", exact: true }).click();
  await page.getByText("Noter un événement ponctuel", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Habitude liée à l’événement", exact: true })
    .selectOption({ label: "Tabac" });
  await page.getByRole("button", { name: "Enregistrer l’événement" }).click();
  await page
    .getByRole("link", { name: "Mes habitudes", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: "Oui", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Valider la journée" }),
  ).toBeEnabled();
  await expect(page.getByText(/0 % en accord avec ton cap/)).toBeVisible();
});
test("Target plans are versioned and drive the transparent ghost at the selected minute", async ({
  page,
}) => {
  await profile(page);
  await page.goto("/#/fantome");
  await page
    .getByLabel("Nom de la journée type", { exact: true })
    .fill("Semaine");
  await page
    .getByLabel("Nom du créneau", { exact: true })
    .fill("Marche du soir");
  await page.getByLabel("Début prévu", { exact: true }).fill("18:00");
  await page
    .getByRole("button", { name: "Ajouter le créneau", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer une nouvelle version" })
    .click();
  await page
    .getByRole("combobox", { name: "Fantôme de référence", exact: true })
    .selectOption("target");
  await page.getByLabel("Heure comparée", { exact: true }).fill("1095");
  await expect(page.locator(".scene")).toHaveAttribute(
    "data-ghost-mode",
    "walk",
  );
  await expect(page.locator(".scene")).toHaveAttribute(
    "data-ghost-source",
    "artist",
  );
  await expect(page.locator("avatar-scene canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Lire la journée", exact: true })
    .click();
  await page.clock.fastForward(600);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page
    .getByLabel("Applicable à partir du", { exact: true })
    .fill("2026-10-22");
  await page
    .getByRole("button", { name: "Retirer le créneau Marche du soir" })
    .click();
  await page
    .getByRole("button", { name: "Enregistrer une nouvelle version" })
    .click();
  await page.getByLabel("Heure comparée", { exact: true }).fill("1095");
  await expect(page.locator(".scene")).toHaveAttribute(
    "data-ghost-mode",
    "walk",
  );
  await expect(
    page.getByText("Historique des versions du planning"),
  ).toContainText("(2)");
  await page.getByLabel("Journée suivie", { exact: true }).fill("2026-10-20");
  await expect(
    page.getByText("Aucune journée type applicable à cette date."),
  ).toBeVisible();
  await expect(page.locator(".ghost-stats").first()).toContainText("?");
  await page
    .getByLabel("Applicable à partir du", { exact: true })
    .fill("2026-10-20");
  await page
    .getByRole("button", { name: "Enregistrer une nouvelle version" })
    .click();
  await expect(
    page.getByText("Le planning ne peut pas modifier le passé."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  await page
    .getByRole("button", { name: "Modifier Camille", exact: true })
    .click();
  await page
    .getByLabel("Sexe physiologique · pour le modèle")
    .selectOption("female");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.goto("/#/fantome");
  await page
    .getByRole("combobox", { name: "Fantôme de référence", exact: true })
    .selectOption("target");
  await page.getByLabel("Heure comparée", { exact: true }).fill("1095");
  await expect(page.locator(".scene")).toHaveAttribute(
    "data-variant",
    "female",
  );
  await expect(page.locator(".scene")).toHaveAttribute(
    "data-ghost-source",
    "artist",
  );
  await expect(
    page.getByText("Historique des versions du planning"),
  ).toContainText("(2)");
});
test("named journal events support covered historical frequency and point quantities", async ({
  page,
}) => {
  await profile(page);
  for (const day of ["2026-10-19", "2026-10-20"]) {
    await page.goto("/#/journal");
    await page
      .getByRole("combobox", { name: "Repère ou activité", exact: true })
      .selectOption("screen");
    await page.getByLabel("Date", { exact: true }).fill(day);
    await page
      .getByLabel("Nom de l’activité (facultatif)", { exact: true })
      .fill("Instagram");
    await page.getByLabel("Durée · min").fill("60");
    await page.getByLabel("Heure de début").fill("17:00");
    await page.getByRole("button", { name: "Ajouter au journal" }).click();
    await expect(
      page.getByRole("cell", { name: "Instagram", exact: true }).first(),
    ).toBeVisible();
  }
  await page.goto("/#/fantome");
  await page
    .getByRole("combobox", { name: "Fantôme de référence", exact: true })
    .selectOption("average");
  await page
    .getByRole("combobox", { name: "Habitude comparée", exact: true })
    .selectOption(JSON.stringify(["screen", "Instagram"]));
  await page.getByLabel("Heure comparée", { exact: true }).fill("1050");
  await expect(page.locator(".race-panel")).toContainText("2 / 2");
  await expect(page.locator(".scene")).toHaveAttribute(
    "data-ghost-mode",
    "screen",
  );
  await page.getByLabel("Heure comparée", { exact: true }).fill("720");
  await expect(page.locator(".race-panel")).toContainText("0 / 0");
  await page
    .getByRole("combobox", { name: "Fantôme de référence", exact: true })
    .selectOption("past");
  await page
    .locator("ghost-timeline")
    .nth(1)
    .getByRole("button", { name: /Instagram.*17:00/ })
    .click();
  await page
    .getByRole("button", { name: "Préparer un changement sur ce créneau" })
    .click();
  await expect(
    page.getByLabel("Applicable à partir du", { exact: true }),
  ).toHaveValue("2026-10-22");
  await expect(page.getByLabel("Début prévu", { exact: true })).toHaveValue(
    "17:00",
  );
  await expect(
    page.getByLabel("Durée prévue (min)", { exact: true }),
  ).toHaveValue("60");
  await expect(
    page.getByText("Historique des versions du planning"),
  ).toContainText("(0)");
  await page.getByRole("button", { name: "Revenir au direct" }).click();
  await page.getByText("Noter un événement ponctuel", { exact: true }).click();
  await page.getByLabel("Quantité", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Enregistrer l’événement" }).click();
  await page
    .getByRole("combobox", { name: "Habitude comparée", exact: true })
    .selectOption("tobacco");
  await expect(page.locator(".ghost-stats").first()).toContainText(
    "2 cigarette",
  );
});
test("ghost is keyboard accessible, local-only and fits all reference viewports in both languages", async ({
  page,
  baseURL,
}) => {
  const external: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      new URL(r.url()).origin !== new URL(baseURL!).origin
    )
      external.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await page
    .getByRole("link", { name: "Comparer avec mon fantôme", exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  for (const width of [402, 834, 1512, 1920]) {
    await page.setViewportSize({ width, height: 982 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.getByLabel("Langue").selectOption("en");
  await expect(page.getByRole("heading", { name: "My ghost" })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Reference ghost", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Reference ghost", exact: true })
    .selectOption("average");
  await expect(
    page.getByRole("combobox", { name: "Comparable days", exact: true }),
  ).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
