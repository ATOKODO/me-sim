import { chromium, expect } from "@playwright/test";
const browser = await chromium.connectOverCDP(
  process.env.ME_SIM_NATIVE_DEBUG_URL ?? "http://127.0.0.1:9223",
);
try {
  const page = browser.contexts()[0].pages()[0];
  const state = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("initial_state"),
  );
  if (!state.storagePath.includes("native-smoke"))
    throw Error("Refusing to mutate non-test storage");
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await expect(page.locator(".sidebar")).toHaveCSS("position", "fixed");
  await expect(page.locator("ui-icon").first()).toHaveCSS("width", "20px");
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  const profileName = "Test Windows " + Date.now();
  await page.getByLabel("Prénom ou pseudonyme").fill(profileName);
  await page
    .getByRole("button", { name: "Créer le profil", exact: true })
    .click();
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await page.getByLabel("Valeur · kg").fill("71.8");
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  await expect(page.getByRole("cell", { name: "71,8 kg" })).toBeVisible();
  await page.reload();
  await page.getByLabel("Profil actif").selectOption({ label: profileName });
  await expect(page.getByRole("cell", { name: "71,8 kg" })).toBeVisible();
  const saved = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("initial_state"),
  );
  if (
    !saved.snapshot.observations.some(
      (o) =>
        o.value === 71.8 &&
        o.profileId ===
          saved.snapshot.profiles.find((p) => p.name === profileName)?.id,
    )
  )
    throw Error("SQLite persistence failed");
  await page.getByRole("link", { name: "Mes profils", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter un profil démo" }).click();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByLabel("Profil actif").locator("option:checked"),
  ).toHaveText("Alex · Démo");
  const notice = page.getByRole("button", { name: "Fermer le message" });
  if (await notice.isVisible()) await notice.click();
  const preview = page.getByLabel("Prévisualiser l’animation d’une habitude");
  for (const mode of [
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
  ]) {
    await preview.selectOption(mode);
    await expect(
      page.locator(`.scene[data-mode='${mode}']`).first(),
    ).toContainText("ANIMATION GLB");
  }
  await preview.selectOption("idle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: "docs/native-dashboard.png", fullPage: true });
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      nativePersistence: true,
      nativeAvatarModes: 15,
      storage: saved.storagePath,
      profiles: saved.snapshot.profiles.length,
      observations: saved.snapshot.observations.length,
      errors,
    }),
  );
} finally {
  await browser.close();
}
