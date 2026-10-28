import { test, expect } from "@playwright/test";

/** @spec TECH-TOOLING-TESTS */
function gate() {
  let open!: () => void;
  const wait = new Promise<void>((resolve) => (open = resolve));
  return { wait, open };
}
/** @spec TECH-TOOLING-TESTS */
function pendingRequest() {
  return { entered: gate(), released: gate() };
}

for (const variant of ["default", "female"] as const) {
  test(`${variant} avatar stays hidden while manifest and GLB load, including page recreation`, async ({
    page,
  }) => {
    let manifest = pendingRequest();
    let model = pendingRequest();
    let failModel = true;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/avatar/animations.json", async (route) => {
      const current = manifest;
      current.entered.open();
      await current.released.wait;
      await route.continue();
    });
    await page.route("**/character/*-casual.glb", async (route) => {
      const current = model;
      const fail = failModel;
      current.entered.open();
      await current.released.wait;
      if (fail)
        await route.fulfill({ status: 503, body: "Unavailable test asset" });
      else await route.continue();
    });
    await page.goto("/#/parametres");
    await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
    // Dismiss the mutation notice so reload keeps the canvas at the same pixel position.
    await page
      .getByRole("button", { name: "Fermer le message", exact: true })
      .click();
    if (variant === "female") {
      await page
        .getByRole("link", { name: "Mes profils", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Modifier Alex · Démo", exact: true })
        .click();
      await page
        .getByLabel("Sexe physiologique · pour le modèle")
        .selectOption("female");
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
    }
    const scene = page.locator(".scene").first();
    // Hide overlays so differences measure the rendered person, not its loading caption.
    /** @spec TECH-TOOLING-TESTS */
    const capture = async () => {
      await page.waitForTimeout(100);
      return scene.locator("canvas").screenshot({
        style:
          ".scene-caption, .camera-controls, .camera-hint, .scene-corner { visibility: hidden !important; }",
      });
    };
    let emptyRoom: Buffer | undefined;
    try {
      // The browser preview does not persist profiles on reload; refresh is covered by default.
      for (const visit of variant === "default"
        ? ["failure", "navigate", "reload"]
        : ["failure", "navigate"]) {
        manifest = pendingRequest();
        model = pendingRequest();
        failModel = visit === "failure";
        if (visit === "navigate") {
          await page
            .getByRole("link", { name: "Mon journal", exact: true })
            .click();
          await page
            .getByRole("link", { name: "Mon aperçu", exact: true })
            .click();
        } else if (visit === "reload") await page.reload();
        else
          await page
            .getByRole("link", { name: "Mon aperçu", exact: true })
            .click();
        await manifest.entered.wait;
        await expect(scene).toHaveAttribute("data-source", "loading");
        await expect(scene).toContainText("Chargement du personnage…");
        await expect(scene.locator("canvas")).toBeVisible();
        await expect(scene.locator(".camera-controls")).toBeVisible();
        const beforeManifest = await capture();
        if (!emptyRoom) emptyRoom = beforeManifest;
        else expect(beforeManifest.equals(emptyRoom)).toBe(true);
        manifest.released.open();
        await model.entered.wait;
        await expect(scene).toHaveAttribute("data-source", "loading");
        expect((await capture()).equals(emptyRoom)).toBe(true);
        await scene.screenshot({
          path: `test-results/avatar-loading-${variant}-${visit}.png`,
        });
        model.released.open();
        if (failModel) {
          await expect(scene).toHaveAttribute("data-source", "procedural");
          await expect(scene).toContainText("SCÈNE 3D");
          // A real failure renders the cube; it must differ from the loading image.
          expect((await capture()).equals(emptyRoom)).toBe(false);
        } else {
          await expect(scene).toHaveAttribute("data-source", "artist");
          await expect(scene).toContainText("ANIMATION GLB");
          expect((await capture()).equals(emptyRoom)).toBe(false);
        }
      }
      expect(errors).toEqual([]);
    } finally {
      manifest.released.open();
      model.released.open();
    }
  });
}

test("a missing manifest completes loading and keeps the procedural animation usable", async ({
  page,
}) => {
  await page.route("**/avatar/animations.json", (route) =>
    route.fulfill({ status: 404, body: "Missing test manifest" }),
  );
  await page.goto("/");
  const scene = page.locator(".scene").first();
  await expect(scene).toHaveAttribute("data-source", "procedural");
  await expect(scene).toContainText("SCÈNE 3D");
  await page
    .getByLabel("Prévisualiser l’animation d’une habitude")
    .selectOption("exercise");
  await expect(scene).toHaveAttribute("data-mode", "exercise");
  await expect(scene).toHaveAttribute("data-source", "procedural");
  await expect(scene.locator("canvas")).toBeVisible();
});
