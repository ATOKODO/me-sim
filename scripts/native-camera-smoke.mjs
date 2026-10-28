import { chromium, expect } from "@playwright/test";
import { resolve, sep } from "node:path";

const browser = await chromium.connectOverCDP(
  process.env.ME_SIM_NATIVE_DEBUG_URL ?? "http://127.0.0.1:9224",
);
try {
  const page = browser.contexts()[0].pages()[0];
  const state = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("initial_state"),
  );
  if (
    !resolve(state.storagePath)
      .toLowerCase()
      .startsWith((resolve(".tmp/native-smoke") + sep).toLowerCase())
  )
    throw Error("Refusing to change non-test storage");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter un profil démo" }).click();
  await page.getByRole("link", { name: "Préférences", exact: true }).click();
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  const scene = page.locator(".scene").first();
  await expect(scene).toContainText("ANIMATION GLB");
  await expect(scene.locator(".camera-zoom")).toHaveText("100 %");
  await page.waitForTimeout(150);
  const canvas = scene.locator("canvas");
  /** @spec TECH-TOOLING-VALIDATION */
  const capture = () =>
    canvas.screenshot({ mask: [scene.locator(".camera-controls")] });
  const initial = await capture();
  const box = await canvas.boundingBox();
  if (!box) throw Error("Native canvas missing");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.65, {
    steps: 12,
  });
  await page.mouse.up();
  await page.waitForTimeout(100);
  if ((await capture()).equals(initial))
    throw Error("Native orbit did not change the rendered view");
  await page.mouse.wheel(0, -600);
  await expect(scene.locator(".camera-zoom")).not.toHaveText("100 %");
  await scene
    .getByRole("button", { name: "Réinitialiser la caméra", exact: true })
    .click();
  await expect(scene.locator(".camera-zoom")).toHaveText("100 %");
  await page.waitForTimeout(100);
  if (!(await capture()).equals(initial))
    throw Error("Native reset did not restore the rendered view");
  await page.mouse.move(1, 1);
  await page.screenshot({ path: "docs/native-dashboard.png", fullPage: true });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      nativeCamera: true,
      mouseOrbit: true,
      wheelZoom: true,
      exactReset: true,
      errors,
    }),
  );
} finally {
  await browser.close();
}
