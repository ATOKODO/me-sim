import { test, expect } from "@playwright/test";
test("dashboard renders locally and captures the PS1 scene", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:1421")) requests.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ton avatar aujourd’hui" }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});
test("profiles isolate observations and journal supports edit/delete", async ({
  page,
}) => {
  await page.goto("/#/profils");
  await page.getByLabel("Prénom ou pseudonyme").fill("Camille");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await expect(page.getByLabel("Profil actif").locator("option:checked")).toHaveText("Camille");
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await expect(page.getByText("Aucune mesure pour le moment.")).toBeVisible();
  await page.getByLabel("Valeur · kg").fill("68.5");
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(page.getByRole("cell", { name: "68,5 kg" })).toBeVisible();
  await page.getByRole("button", { name: /Modifier weight/ }).click();
  await page.getByLabel("Valeur · kg").fill("69.2");
  await page.getByRole("button", { name: "Enregistrer la correction" }).click();
  await expect(page.getByRole("cell", { name: "69,2 kg" })).toBeVisible();
  await page.getByLabel("Profil actif").selectOption({ label: "Alex · Démo" });
  await expect(page.getByRole("cell", { name: "69,2 kg" })).toHaveCount(0);
  await page.getByLabel("Profil actif").selectOption({ label: "Camille" });
  await page.getByRole("button", { name: /Supprimer weight/ }).click();
  await page.getByRole("button", { name: "Supprimer", exact: true }).click();
  await expect(page.getByText("Aucune mesure pour le moment.")).toBeVisible();
});
test("scenarios save without inventing scientific predictions", async ({
  page,
}) => {
  await page.goto("/#/futurs");
  await expect(
    page.getByRole("button", { name: "Projections indisponibles" }),
  ).toBeDisabled();
  await page.getByLabel("Nom", { exact: true }).fill("Mon hypothèse");
  await page.getByLabel("Variation d’apports").fill("-100");
  await page.getByRole("button", { name: "Enregistrer le scénario" }).click();
  await expect(page.getByText("Mon hypothèse", { exact: true })).toBeVisible();
  await expect(page.getByText("Non calculé", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/futures.png", fullPage: true });
});
test("2D preference and loss of WebGL retain a usable avatar", async ({
  page,
}) => {
  await page.goto("/#/parametres");
  await page.getByRole("switch", { name: /Préférer le mode 2D/ }).check();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(page.getByText("Vue 2D · ton avatar")).toBeVisible();
  await page.getByRole("link", { name: "Préférences", exact: true }).click();
  await page.getByRole("switch", { name: /Préférer le mode 2D/ }).uncheck();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context")
        ?.loseContext(),
    );
  await expect(page.getByText("Vue 2D · ton avatar")).toBeVisible();
});
test("all routes work at minimum desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 740 });
  for (const route of [
    "/",
    "/journal",
    "/futurs",
    "/profils",
    "/donnees",
    "/parametres",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
import AxeBuilder from "@axe-core/playwright";
test("keyboard dialog traps focus, cancels with Escape, and returns focus", async ({
  page,
}) => {
  await page.goto("/#/profils");
  const trigger = page.getByRole("button", { name: "Supprimer Alex · Démo" });
  await trigger.click();
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Supprimer le profil", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Annuler", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test("essential accessibility semantics on each route", async ({ page }) => {
  for (const route of [
    "/",
    "/journal",
    "/futurs",
    "/profils",
    "/donnees",
    "/parametres",
  ]) {
    await page.goto("/#" + route);
    await expect(page.locator("h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
