import fs from "node:fs";
import { expect } from "@playwright/test";
import { test } from "./fixtures";
const index = JSON.parse(
  fs.readFileSync("storybook-static/index.json", "utf8"),
);
const stories = Object.values(index.entries).filter(
  (entry: any) => entry.type === "story" && entry.tags.includes("visual"),
) as { id: string; title: string; name: string }[];
if (stories.length === 0)
  throw Error("No visual stories found. Run npm run build:storybook first.");
for (const theme of ["dark", "light"])
  for (const story of stories) {
    test(theme + " / " + story.title + " / " + story.name, async ({ page }) => {
      await page.goto(
        "http://127.0.0.1:6107/iframe.html?id=" +
          story.id +
          "&viewMode=story&globals=theme:" +
          theme +
          ";language:fr",
      );
      await expect(page.locator("[data-visual-ready]")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(story.id + "-" + theme + ".png", {
        fullPage: true,
      });
    });
  }
test("keyboard focus and disabled button use native semantics", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:6107/iframe.html?id=composants-boutons--galerie&viewMode=story",
  );
  await expect(
    page.getByRole("heading", { name: "Actions et états" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Enregistrer", exact: true }).first(),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Enregistrer", exact: true }).last(),
  ).toBeDisabled();
  await expect(page).toHaveScreenshot("button-keyboard-focus.png", {
    fullPage: true,
  });
});
