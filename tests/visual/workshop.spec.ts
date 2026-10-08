import { expect } from "@playwright/test";
import { test } from "./fixtures";
test("Storybook controls, themes, language and Docs work together", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:6107/?path=/story/composants-mesure--connue",
  );
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.locator(".metric-value")).toContainText("75,9");
  await page.locator("#control-value").fill("0");
  await page.locator("#control-value").press("Tab");
  await expect(preview.locator(".metric-value")).toContainText("0");
  await expect(preview.locator(".unknown")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Thème de l’application Sombre", exact: true })
    .click();
  await page.getByText("Clair", { exact: true }).click();
  await expect(preview.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", {
      name: "Langue de l’application Français",
      exact: true,
    })
    .click();
  await page.getByText("English", { exact: true }).click();
  await expect(preview.locator("html")).toHaveAttribute("lang", "en");
  await expect(preview.locator(".metric-heading > span").first()).toHaveText(
    "Weight",
  );
  await expect(preview.locator(".metric-value")).toContainText("0");
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(
    preview.getByRole("heading", { name: "Mesure", exact: true }),
  ).toContainText("Mesure");
  await expect(
    preview
      .getByText("Composants et styles partagés avec Me-Sim.", { exact: false })
      .first(),
  ).toBeVisible();
});
