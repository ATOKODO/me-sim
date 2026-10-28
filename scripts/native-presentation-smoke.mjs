import { chromium, expect } from "@playwright/test";
const browser = await chromium.connectOverCDP(
  process.env.ME_SIM_NATIVE_DEBUG_URL ?? "http://127.0.0.1:9226",
);
try {
  const page = browser.contexts()[0].pages()[0];
  /** @spec TECH-TOOLING-VALIDATION */
  const state = () =>
    page.evaluate(() => window.__TAURI_INTERNALS__.invoke("initial_state"));
  const initial = await state();
  if (
    !initial.storagePath
      .replaceAll("\\", "/")
      .includes("/.tmp/native-smoke/appearance/")
  )
    throw Error("Refusing to mutate non-test storage");
  if (
    initial.snapshot.settings.language !== "fr" ||
    initial.snapshot.settings.theme !== "dark"
  ) {
    await page.evaluate(
      ({ settings, revision }) =>
        window.__TAURI_INTERNALS__.invoke("mutate", {
          expectedRevision: revision,
          operation: {
            type: "settings",
            value: { ...settings, language: "fr", theme: "dark" },
          },
        }),
      { settings: initial.snapshot.settings, revision: initial.revision },
    );
    await page.reload();
  }
  await expect(page.getByLabel("Langue", { exact: true })).toBeVisible();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  if (!initial.snapshot.profiles.length) {
    await page.getByRole("link", { name: "Mes profils", exact: true }).click();
    await page
      .getByRole("button", { name: "Ajouter un profil démo", exact: true })
      .click();
  }
  const before = (await state()).snapshot;
  await page.getByLabel("Langue", { exact: true }).selectOption("en");
  await page
    .getByRole("button", { name: "Switch to light theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const saved = (await state()).snapshot;
  expect(saved.settings.language).toBe("en");
  expect(saved.settings.theme).toBe("light");
  expect(saved.profiles).toEqual(before.profiles);
  expect(saved.observations).toEqual(before.observations);
  expect(saved.habitDays).toEqual(before.habitDays);
  // The local database must take precedence over a stale WebView presentation cache.
  await page.evaluate(() =>
    localStorage.setItem(
      "me-sim.appearance.v1",
      JSON.stringify({ language: "fr", theme: "dark" }),
    ),
  );
  await page.reload();
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Preferences", exact: true }).click();
  await expect(page.getByLabel("Theme", { exact: true })).toHaveValue("light");
  await expect(
    page.getByText("Bring the avatar to life", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My futures", exact: true }).click();
  await page
    .getByRole("button", { name: "View model details", exact: true })
    .click();
  await expect(page.locator(".model-sheet")).toContainText(
    "redistribution license",
  );
  await page.getByRole("link", { name: "My overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your avatar today", exact: true }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("avatar-scene").first()).toContainText(
    "GLB ANIMATION",
  );
  await page.screenshot({
    path: ".tmp/native-smoke/appearance/native-light.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      nativeSettingsPersisted: true,
      staleCacheOverridden: true,
      userDataPreserved: true,
      englishModelDetails: true,
      lightTheme: true,
      errors,
    }),
  );
} finally {
  await browser.close();
}
