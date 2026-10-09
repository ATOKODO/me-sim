import { test, expect } from "@playwright/test";

const modes = [
  "idle",
  "walk",
  "exercise",
  "work",
  "social",
  "screen",
  "screen_evening",
  "gaming",
  "reading",
  "meal",
  "alcohol",
  "tobacco",
  "vaping",
  "sedentary",
  "rest",
];

for (const variant of ["default", "female"] as const) {
  test(`${variant} textured rig plays every habit from one local GLB`, async ({
    page,
    baseURL,
  }) => {
    const errors: string[] = [];
    const modelRequests: string[] = [];
    const remoteRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" ||
        /indisponible|PropertyBinding/.test(message.text())
      )
        errors.push(message.text());
    });
    page.on("request", (request) => {
      if (
        /^https?:/.test(request.url()) &&
        new URL(request.url()).origin !== new URL(baseURL!).origin
      )
        remoteRequests.push(request.url());
      if (
        request
          .url()
          .endsWith(
            `/character/${variant === "female" ? "female" : "male"}-casual.glb`,
          )
      )
        modelRequests.push(request.url());
    });
    if (variant === "female") {
      await page.goto("/#/profils");
      await page
        .getByRole("button", { name: "Modifier Alex · Démo", exact: true })
        .click();
      await page
        .getByLabel("Sexe physiologique · pour le modèle")
        .selectOption("female");
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
    } else await page.goto("/");
    await expect(page.locator(".scene").first()).toHaveAttribute(
      "data-variant",
      variant,
    );
    const preview = page.getByLabel("Prévisualiser l’animation d’une habitude");
    for (const mode of modes) {
      await preview.selectOption(mode);
      const scene = page.locator(`.scene[data-mode='${mode}']`).first();
      await expect(scene).toContainText("ANIMATION GLB");
      await page.waitForTimeout(500);
      await scene.screenshot({
        path: `test-results/avatar-${variant}-${mode}.png`,
      });
    }
    expect(modelRequests).toHaveLength(1);
    expect(remoteRequests).toEqual([]);
    expect(errors).toEqual([]);

    // Preparing and replaying all events also reuses the same mesh/skeleton.
    await page.getByRole("button", { name: "Rejouer la journée" }).click();
    await expect(
      page.getByRole("button", { name: "Arrêter la relecture" }),
    ).toBeEnabled();
    await expect(page.locator(".scene").first()).toContainText("ANIMATION GLB");
    for (const event of await page.locator(".timeline-event").all()) {
      await event.click();
      await expect(page.locator(".scene").first()).toContainText(
        "ANIMATION GLB",
      );
    }
    expect(modelRequests).toHaveLength(1);
    expect(remoteRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("artist animation respects the animation toggle and survives scene recreation", async ({
  page,
}) => {
  await page.goto("/#/parametres");
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await page
    .getByLabel("Prévisualiser l’animation d’une habitude")
    .selectOption("exercise");
  await expect(page.locator(".scene").first()).toContainText("ANIMATION GLB");
  await page.waitForTimeout(200);
  const canvas = page.locator("canvas").first();
  const frozen = await canvas.screenshot();
  await page.waitForTimeout(450);
  expect((await canvas.screenshot()).equals(frozen)).toBe(true);
  await page.getByRole("link", { name: "Préférences", exact: true }).click();
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).check();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await page
    .getByLabel("Prévisualiser l’animation d’une habitude")
    .selectOption("exercise");
  await expect(page.locator(".scene").first()).toContainText("ANIMATION GLB");
  const animated = await canvas.screenshot();
  await page.waitForTimeout(350);
  expect((await canvas.screenshot()).equals(animated)).toBe(false);
});

test("profile switches select distinct cached models without resetting the camera", async ({
  page,
}) => {
  const files: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".glb"))
      files.push(new URL(request.url()).pathname);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#/parametres");
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  await page.getByLabel("Prénom ou pseudonyme").fill("Jane");
  await page
    .getByLabel("Sexe physiologique · pour le modèle")
    .selectOption("female");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  const scene = page.locator(".scene").first();
  await expect(scene).toHaveAttribute("data-variant", "female");
  await expect(scene).toContainText("ANIMATION GLB");
  await scene
    .getByRole("button", { name: "Zoomer la scène", exact: true })
    .click();
  await page.waitForTimeout(100);
  const canvas = scene.locator("canvas");
  await canvas.evaluate((el) => (el.dataset["identity"] = "original-room"));
  const female = await canvas.screenshot();
  await scene.screenshot({ path: "test-results/avatar-female-profile.png" });
  await page.getByLabel("Profil actif").selectOption({ label: "Alex · Démo" });
  await expect(scene).toHaveAttribute("data-variant", "default");
  await expect(scene).toContainText("ANIMATION GLB");
  await expect(scene.locator(".camera-zoom")).toHaveText("125 %");
  await expect(canvas).toHaveAttribute("data-identity", "original-room");
  await page.waitForTimeout(100);
  const male = await canvas.screenshot();
  expect(male.equals(female)).toBe(false);
  await scene.screenshot({ path: "test-results/avatar-male-profile.png" });
  await page.getByLabel("Profil actif").selectOption({ label: "Jane" });
  await expect(scene).toContainText("ANIMATION GLB");
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(female)).toBe(true);
  expect(files.sort()).toEqual([
    "/avatar/character/female-casual.glb",
    "/avatar/character/male-casual.glb",
  ]);
  expect(errors).toEqual([]);
  await page.getByRole("link", { name: "Mes futurs", exact: true }).click();
  const comparisons = page.locator(".comparison-grid .scene");
  await expect(comparisons).toHaveCount(2);
  for (const comparison of await comparisons.all()) {
    await expect(comparison).toHaveAttribute("data-variant", "female");
    await expect(comparison).toContainText("ANIMATION GLB");
  }
  // Editing the same profile also updates its model on the next visit.
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  await page
    .getByRole("button", { name: "Modifier Jane", exact: true })
    .click();
  await page.getByLabel("Sexe physiologique · pour le modèle").selectOption("");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(scene).toHaveAttribute("data-variant", "default");
  await expect(scene).toContainText("ANIMATION GLB");
});

test("a late female GLB cannot replace the subsequently selected male profile", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let requested!: () => void;
  const started = new Promise<void>((resolve) => (requested = resolve));
  await page.route("**/character/female-casual.glb", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.goto("/#/parametres");
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  await page.getByLabel("Prénom ou pseudonyme").fill("Jane");
  await page
    .getByLabel("Sexe physiologique · pour le modèle")
    .selectOption("female");
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  try {
    await started;
    const scene = page.locator(".scene").first();
    await page
      .getByLabel("Profil actif")
      .selectOption({ label: "Alex · Démo" });
    await expect(scene).toHaveAttribute("data-variant", "default");
    await expect(scene).toContainText("ANIMATION GLB");
    await page.waitForTimeout(100);
    const male = await scene.locator("canvas").screenshot();
    const response = page.waitForResponse("**/character/female-casual.glb");
    release();
    await (await response).finished();
    await page.waitForTimeout(350);
    expect((await scene.locator("canvas").screenshot()).equals(male)).toBe(
      true,
    );
    await page.getByLabel("Profil actif").selectOption({ label: "Jane" });
    await expect(scene).toHaveAttribute("data-variant", "female");
    await expect(scene).toContainText("ANIMATION GLB");
    await page.waitForTimeout(100);
    expect((await scene.locator("canvas").screenshot()).equals(male)).toBe(
      false,
    );
  } finally {
    release();
  }
});
