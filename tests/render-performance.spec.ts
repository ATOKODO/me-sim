import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__drawCalls = 0;
    const gl = WebGL2RenderingContext.prototype as any;
    for (const name of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const draw = gl[name];
      gl[name] = function (...args: unknown[]) {
        w.__drawCalls++;
        return draw.apply(this, args);
      };
    }
  });
});
/** @spec TECH-TOOLING-TESTS */
const draws = (page: Page) =>
  page.evaluate(() => (window as any).__drawCalls as number);
/** @spec TECH-TOOLING-TESTS */
async function expectStopped(page: Page) {
  await page.waitForTimeout(200);
  const before = await draws(page);
  await page.waitForTimeout(250);
  expect(await draws(page)).toBe(before);
}

test("a static scene redraws after asset loading and camera input, then stops drawing", async ({
  page,
}) => {
  await page.goto("/#/parametres");
  await page.getByRole("switch", { name: /Donner vie à l’avatar/ }).uncheck();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  const scene = page.locator(".scene").first();
  await expect(scene).toHaveAttribute("data-source", "artist");
  await expectStopped(page);
  const before = await draws(page);
  expect(before).toBeGreaterThan(0);
  await scene
    .getByRole("button", { name: "Zoomer la scène", exact: true })
    .click();
  await expect.poll(() => draws(page)).toBeGreaterThan(before);
  await expectStopped(page);
});

test("an animated scene stops offscreen, resumes when visible and cleans up on navigation", async ({
  page,
}) => {
  await page.goto("/#/");
  const scene = page.locator(".scene").first();
  await expect(scene).toHaveAttribute("data-source", "artist");
  const initial = await draws(page);
  await expect.poll(() => draws(page)).toBeGreaterThan(initial);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect
    .poll(async () => {
      const box = await scene.boundingBox();
      return !!box && box.y + box.height <= 0;
    })
    .toBe(true);
  await expectStopped(page);
  const before = await draws(page);
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(() => draws(page)).toBeGreaterThan(before);
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await expect(scene).toHaveCount(0);
  await expectStopped(page);
});
