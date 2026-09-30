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

test("supplied textured rig plays every habit from one local GLB", async ({
  page,
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
      new URL(request.url()).origin !== "http://127.0.0.1:1421"
    )
      remoteRequests.push(request.url());
    if (request.url().includes("male-casual.glb"))
      modelRequests.push(request.url());
  });
  await page.goto("/");
  const preview = page.getByLabel("Prévisualiser l’animation d’une habitude");
  for (const mode of modes) {
    await preview.selectOption(mode);
    const scene = page.locator(`.scene[data-mode='${mode}']`).first();
    await expect(scene).toContainText("ANIMATION GLB");
    await page.waitForTimeout(500);
    await scene.screenshot({ path: `test-results/avatar-${mode}.png` });
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
    await expect(page.locator(".scene").first()).toContainText("ANIMATION GLB");
  }
  expect(modelRequests).toHaveLength(1);
  expect(remoteRequests).toEqual([]);
  expect(errors).toEqual([]);
});

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
