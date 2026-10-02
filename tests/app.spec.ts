import { test, expect } from "@playwright/test";

function sampleAnimatedGlb() {
  const binary = Buffer.alloc(76);
  const vertices = [0, 0, 0, 0.2, 0, 0, 0, 0.2, 0];
  vertices.forEach((value, index) => binary.writeFloatLE(value, index * 4));
  [0, 1, 2].forEach((value, index) =>
    binary.writeUInt16LE(value, 36 + index * 2),
  );
  [0, 1].forEach((value, index) => binary.writeFloatLE(value, 44 + index * 4));
  [0, 0, 0, 0.1, 0, 0].forEach((value, index) =>
    binary.writeFloatLE(value, 52 + index * 4),
  );
  const gltf = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 6 },
      { buffer: 0, byteOffset: 44, byteLength: 8 },
      { buffer: 0, byteOffset: 52, byteLength: 24 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [0.2, 0.2, 0],
      },
      { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" },
      {
        bufferView: 2,
        componentType: 5126,
        count: 2,
        type: "SCALAR",
        min: [0],
        max: [1],
      },
      { bufferView: 3, componentType: 5126, count: 2, type: "VEC3" },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    nodes: [{ mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    animations: [
      {
        name: "Walk",
        samplers: [{ input: 2, output: 3 }],
        channels: [{ sampler: 0, target: { node: 0, path: "translation" } }],
      },
    ],
  };
  const json = Buffer.from(JSON.stringify(gltf));
  const paddedJson = Buffer.concat([
    json,
    Buffer.alloc((4 - (json.length % 4)) % 4, 0x20),
  ]);
  const glb = Buffer.alloc(12 + 8 + paddedJson.length + 8 + binary.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(paddedJson.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(glb, 20);
  const binaryHeader = 20 + paddedJson.length;
  glb.writeUInt32LE(binary.length, binaryHeader);
  glb.writeUInt32LE(0x004e4942, binaryHeader + 4);
  binary.copy(glb, binaryHeader + 8);
  return glb;
}

test("local artist GLB replaces one habit animation", async ({ page }) => {
  await page.route("**/avatar/animations.json", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version: 1,
        overrides: {
          walk: { file: "clips/walk.glb", clip: "Walk" },
          reading: { file: "clips/walk.glb", clip: "MissingClip" },
        },
      }),
    }),
  );
  await page.route("**/avatar/clips/walk.glb", (route) =>
    route.fulfill({
      contentType: "model/gltf-binary",
      body: sampleAnimatedGlb(),
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("Prévisualiser l’animation d’une habitude")
    .selectOption("walk");
  await expect(page.locator(".scene[data-mode='walk']")).toContainText(
    "ANIMATION GLB",
  );
  await page
    .getByLabel("Prévisualiser l’animation d’une habitude")
    .selectOption("reading");
  await expect(page.locator(".scene[data-mode='reading']")).toContainText(
    "SCÈNE 3D",
  );
  // A missing clip must not dispose the model used by another habit.
  await page
    .getByLabel("Prévisualiser l’animation d’une habitude")
    .selectOption("walk");
  await expect(page.locator(".scene[data-mode='walk']")).toContainText(
    "ANIMATION GLB",
  );
});

test("habit check-ins validate a day and update its trajectory without mixing profiles", async ({
  page,
}) => {
  await page.goto("/#/profils");
  await page.getByLabel("Prénom ou pseudonyme").fill("Camille");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await page.getByRole("link", { name: "Mes habitudes" }).click();
  await expect(
    page.getByText("Aucune habitude configurée pour ce profil."),
  ).toBeVisible();

  await page
    .getByLabel("Choisir un exemple d’habitude")
    .selectOption("exercise");
  await page.getByRole("button", { name: "Ajouter au suivi" }).click();
  await page
    .getByLabel("Choisir un exemple d’habitude")
    .selectOption("tobacco");
  await page.getByRole("button", { name: "Ajouter au suivi" }).click();

  const sport = page
    .locator(".habit-check-row")
    .filter({ hasText: "Sport / entraînement" });
  const tobacco = page.locator(".habit-check-row").filter({ hasText: "Tabac" });
  await sport.getByRole("button", { name: "Oui" }).click();
  await tobacco.getByRole("button", { name: "Oui" }).click();
  await expect(page.getByText(/50 % en accord avec ton cap/)).toBeVisible();
  await page.getByRole("button", { name: "Valider la journée" }).click();
  await expect(
    page.getByText("Journée validée", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".habit-trajectory circle[fill='#f2b988']"),
  ).toHaveCount(1);

  await tobacco.getByRole("button", { name: "Non" }).click();
  await expect(page.getByText(/100 % en accord avec ton cap/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Valider la journée" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Valider la journée" }).click();
  await expect(
    page.locator(".habit-trajectory circle[fill='#f2b988']"),
  ).toHaveCount(1);

  await page.screenshot({ path: "test-results/habits.png", fullPage: true });
  await page.getByLabel("Profil actif").selectOption({ label: "Alex · Démo" });
  await expect(page.locator(".habit-check-row")).toHaveCount(4);
  await page.getByLabel("Profil actif").selectOption({ label: "Camille" });
  await expect(page.locator(".habit-check-row")).toHaveCount(2);
});

test("dashboard renders locally and captures the PS1 scene", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (new URL(r.url()).origin !== "http://127.0.0.1:1421")
      requests.push(r.url());
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
test("target day saves and shows the seven-day deviation trajectory", async ({
  page,
}) => {
  await page.goto("/#/");
  await expect(
    page.getByRole("heading", { name: "Ma journée idéale, à ma portée" }),
  ).toBeVisible();
  await page.getByLabel("Sommeil cible (h)").fill("8.5");
  await page.getByLabel("Réseaux / écran max (min)").fill("60");
  await page.getByRole("button", { name: "Enregistrer ma cible" }).click();
  await expect(page.getByText("Ma déviation vers le Target")).toBeVisible();
  await expect(page.locator(".deviation-chart .deviation-day")).toHaveCount(7);
  await expect(
    page.locator(".deviation-chart .deviation-number").first(),
  ).toBeVisible();
  const chartLayout = await page
    .locator(".deviation-panel")
    .evaluate((panel) => {
      const chart = panel
        .querySelector(".deviation-chart")!
        .getBoundingClientRect();
      const legend = panel
        .querySelector(".deviation-legend")!
        .getBoundingClientRect();
      const dateBottom = Math.max(
        ...Array.from(
          panel.querySelectorAll(".deviation-date"),
          (date) => date.getBoundingClientRect().bottom,
        ),
      );
      return { chartBottom: chart.bottom, legendTop: legend.top, dateBottom };
    });
  expect(chartLayout.dateBottom).toBeLessThanOrEqual(
    chartLayout.chartBottom + 1,
  );
  expect(chartLayout.dateBottom).toBeLessThanOrEqual(chartLayout.legendTop);
  await page.screenshot({
    path: "test-results/fixed-target.png",
    fullPage: true,
  });
});
test("journal documents a negative habit and replays the last 24 hours", async ({
  page,
}) => {
  await page.goto("/#/journal");
  await page.getByRole("button", { name: "Jeux vidéo", exact: true }).click();
  await page.getByLabel("Durée · min").fill("90");
  await page.getByLabel("Heure de début").fill("08:15");
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(
    page.getByRole("cell", { name: /Jeux vidéo/ }).first(),
  ).toBeVisible();
  await page.goto("/#/");
  await expect(
    page.getByRole("heading", { name: /La journée de/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Jeux vidéo/ }).first(),
  ).toBeVisible();
  await page
    .locator(".timeline-event")
    .filter({ hasText: "Jeux vidéo" })
    .first()
    .click();
  await expect(page.locator(".scene[data-mode='gaming']")).toBeVisible();
  await page.getByRole("button", { name: "Rejouer la journée" }).click();
  await expect(
    page.getByRole("button", { name: "Arrêter la relecture" }),
  ).toBeEnabled();
  await expect(page.locator(".timeline-event").first()).toHaveClass(/active/);
});
test("profiles isolate observations and journal supports edit/delete", async ({
  page,
}) => {
  await page.goto("/#/profils");
  await page.getByLabel("Prénom ou pseudonyme").fill("Camille");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await expect(
    page.getByLabel("Profil actif").locator("option:checked"),
  ).toHaveText("Camille");
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await expect(page.getByText("Aucune mesure pour le moment.")).toBeVisible();
  await page.getByLabel("Valeur · kg").fill("68.5");
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(page.getByRole("cell", { name: "68,5 kg" })).toBeVisible();
  await page.getByRole("button", { name: /Modifier Poids/ }).click();
  await page.getByLabel("Valeur · kg").fill("69.2");
  await page.getByRole("button", { name: "Enregistrer la correction" }).click();
  await expect(page.getByRole("cell", { name: "69,2 kg" })).toBeVisible();
  await page.getByLabel("Profil actif").selectOption({ label: "Alex · Démo" });
  await expect(page.getByRole("cell", { name: "69,2 kg" })).toHaveCount(0);
  await page.getByLabel("Profil actif").selectOption({ label: "Camille" });
  await page.getByRole("button", { name: /Supprimer Poids/ }).click();
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
    "/habitudes",
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
    "/habitudes",
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
