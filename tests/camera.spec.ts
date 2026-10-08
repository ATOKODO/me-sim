import { test, expect, type Locator, type Page } from "@playwright/test";

async function freezeAvatar(page: Page) {
  await page.goto("/#/parametres");
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(page.locator(".scene").first()).toContainText("ANIMATION GLB");
  await page.waitForTimeout(150);
}

async function orbit(page: Page, canvas: Locator) {
  const box = await canvas.boundingBox();
  if (!box) throw Error("Scène 3D absente");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

test("mouse orbit and wheel zoom change the rendered camera; reset restores the initial view", async ({
  page,
}) => {
  await freezeAvatar(page);
  const scene = page.locator(".scene").first();
  const canvas = scene.locator("canvas");
  // The toolbar overlays the canvas: exclude hover/zoom text from camera image comparisons.
  const captureCamera = () =>
    canvas.screenshot({ mask: [scene.locator(".camera-controls")] });
  const initial = await captureCamera();
  await orbit(page, canvas);
  expect((await captureCamera()).equals(initial)).toBe(false);
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(-600, -600);
  await expect
    .poll(async () =>
      Number(
        (await scene.locator(".camera-zoom").innerText()).replace(
          /[^0-9]/g,
          "",
        ),
      ),
    )
    .toBeGreaterThan(100);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await scene
    .getByRole("button", { name: "Réinitialiser la caméra", exact: true })
    .click();
  await expect(scene.locator(".camera-zoom")).toHaveText("100 %");
  await page.waitForTimeout(100);
  expect((await captureCamera()).equals(initial)).toBe(true);
  await scene.screenshot({ path: "test-results/camera-reset.png" });
});

test("camera buttons, keyboard and resize retain bounded zoom and a working reset", async ({
  page,
}) => {
  await freezeAvatar(page);
  const scene = page.locator(".scene").first();
  const canvas = scene.locator("canvas");
  const captureCamera = () =>
    canvas.screenshot({ mask: [scene.locator(".camera-controls")] });
  const zoomIn = scene.getByRole("button", {
    name: "Zoomer la scène",
    exact: true,
  });
  const zoomOut = scene.getByRole("button", {
    name: "Dézoomer la scène",
    exact: true,
  });
  for (let i = 0; i < 15 && (await zoomIn.isEnabled()); i++) {
    const previousZoom = await scene.locator(".camera-zoom").innerText();
    await zoomIn.click();
    await expect(scene.locator(".camera-zoom")).not.toHaveText(previousZoom);
  }
  await expect(zoomIn).toBeDisabled();
  await expect(scene.locator(".camera-zoom")).toHaveText("400 %");
  for (let i = 0; i < 15 && (await zoomOut.isEnabled()); i++) {
    const previousZoom = await scene.locator(".camera-zoom").innerText();
    await zoomOut.click();
    await expect(scene.locator(".camera-zoom")).not.toHaveText(previousZoom);
  }
  await expect(zoomOut).toBeDisabled();
  await expect(scene.locator(".camera-zoom")).toHaveText("70 %");
  await scene.locator(".render-host").focus();
  await page.keyboard.press("r");
  await page.keyboard.press("Shift");
  await page.waitForTimeout(100);
  const keyboardInitial = await captureCamera();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(100);
  expect((await captureCamera()).equals(keyboardInitial)).toBe(false);
  await page.keyboard.press("+");
  await expect(scene.locator(".camera-zoom")).toHaveText("125 %");
  await page.setViewportSize({ width: 960, height: 740 });
  await expect(scene.locator(".camera-zoom")).toHaveText("125 %");
  await scene.locator(".render-host").focus();
  await page.keyboard.press("Home");
  await expect(scene.locator(".camera-zoom")).toHaveText("100 %");
  await expect(zoomIn).toBeEnabled();
  await expect(zoomOut).toBeEnabled();
});

test("comparison cameras remain independent when one WebGL context is lost", async ({
  page,
}) => {
  await freezeAvatar(page);
  await page.getByRole("link", { name: "Mes futurs", exact: true }).click();
  const scenes = page.locator(".comparison-grid .scene");
  await expect(scenes).toHaveCount(2);
  await expect(scenes.nth(0)).toContainText("ANIMATION GLB");
  await expect(scenes.nth(1)).toContainText("ANIMATION GLB");
  await page.waitForTimeout(100);
  const secondInitial = await scenes.nth(1).locator("canvas").screenshot();
  await scenes
    .nth(0)
    .getByRole("button", { name: "Zoomer la scène", exact: true })
    .click();
  await orbit(page, scenes.nth(0).locator("canvas"));
  await expect(scenes.nth(0).locator(".camera-zoom")).toHaveText("125 %");
  await expect(scenes.nth(1).locator(".camera-zoom")).toHaveText("100 %");
  expect(
    (await scenes.nth(1).locator("canvas").screenshot()).equals(secondInitial),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/camera-comparison.png",
    fullPage: true,
  });
  await scenes
    .nth(0)
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context")
        ?.loseContext(),
    );
  await expect(
    scenes.nth(0).getByText("3D indisponible", { exact: true }).first(),
  ).toBeVisible();
  await expect(scenes.nth(0).locator("canvas")).toHaveCount(0);
  await expect(scenes.nth(1).locator("canvas")).toBeVisible();
  await expect(page.locator(".pixel-person")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Caméra 3D" })).toHaveCount(1);
  await expect(page.locator(".render-host[tabindex='0']")).toHaveCount(1);
});
