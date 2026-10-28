import { chromium, expect } from "@playwright/test";
const browser = await chromium.connectOverCDP(
  process.env.ME_SIM_NATIVE_DEBUG_URL ?? "http://127.0.0.1:9231",
);
try {
  const page = browser.contexts()[0].pages()[0];
  /** @spec TECH-TOOLING-VALIDATION */
  const read = () =>
    page.evaluate(() => window.__TAURI_INTERNALS__.invoke("initial_state"));
  const initial = await read();
  if (
    !initial.storagePath
      .replaceAll("\\", "/")
      .includes("/.tmp/native-smoke/fixes/")
  )
    throw Error("Refusing to mutate non-test storage");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const created = await page.evaluate(async (revision) => {
    const profile = {
      id: crypto.randomUUID(),
      name: "Native fixes " + Date.now(),
      birthDate: null,
      sex: null,
      heightCm: null,
      color: "#bde883",
      demo: false,
      target: null,
      habits: [],
    };
    const state = await window.__TAURI_INTERNALS__.invoke("mutate", {
      expectedRevision: revision,
      operation: { type: "saveProfile", value: profile },
    });
    return { profile, state };
  }, initial.revision);
  const changed = await page.evaluate(
    async ({ profile, revision }) => {
      const target = {
        sleepHours: 8,
        steps: 12000,
        activityMinutes: 30,
        exerciseMinutes: 30,
        walkMinutes: 30,
        socialMinutes: 60,
        screenMinutes: 90,
        gamingMinutes: 60,
        alcoholGlasses: 0,
        tobaccoCigarettes: 0,
        vapingMinutes: 0,
        eveningScreenMinutes: 60,
        sedentaryMinutes: 480,
      };
      return await window.__TAURI_INTERNALS__.invoke("mutate", {
        expectedRevision: revision,
        operation: { type: "saveProfile", value: { ...profile, target } },
      });
    },
    { profile: created.profile, revision: created.state.revision },
  );
  const rejected = await page.evaluate(
    async ({ profile, revision }) => {
      try {
        await window.__TAURI_INTERNALS__.invoke("mutate", {
          expectedRevision: revision,
          operation: {
            type: "saveProfile",
            value: { ...profile, name: "Stale rename" },
          },
        });
        return { code: "unexpected success" };
      } catch (error) {
        return error;
      }
    },
    { profile: created.profile, revision: created.state.revision },
  );
  if (rejected.code !== "CONCURRENT_CHANGE")
    throw Error("Stale IPC mutation was not rejected");
  const after = await read();
  const preserved = after.snapshot.profiles.find(
    (p) => p.id === created.profile.id,
  );
  if (
    preserved.target.steps !== 12000 ||
    preserved.name !== created.profile.name ||
    after.revision !== changed.revision
  )
    throw Error("Stale IPC mutation changed persisted data");
  await page.evaluate(
    ({ settings, revision }) =>
      window.__TAURI_INTERNALS__.invoke("mutate", {
        expectedRevision: revision,
        operation: {
          type: "settings",
          value: { ...settings, animations: false },
        },
      }),
    { settings: after.snapshot.settings, revision: after.revision },
  );
  await page.reload();
  await page
    .getByLabel("Profil actif", { exact: true })
    .selectOption({ label: created.profile.name });
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await page.locator('select[formControlName="metric"]').selectOption("vaping");
  await page.locator('input[formControlName="value"]').fill("0");
  await page.locator('input[formControlName="time"]').fill("");
  await page
    .getByRole("button", { name: "Ajouter au journal", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "0 min", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByLabel("Profil actif", { exact: true })
    .selectOption({ label: created.profile.name });
  const saved = await read();
  const zero = saved.snapshot.observations.find(
    (o) => o.profileId === created.profile.id && o.metric === "vaping",
  );
  if (
    !zero ||
    zero.value !== 0 ||
    zero.at !== null ||
    zero.durationMinutes !== null
  )
    throw Error("Declared zero did not persist in native SQLite");
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(page.locator(".timeline-event")).toHaveCount(0);
  await expect(
    page
      .locator(".recap-grid div")
      .filter({ has: page.getByText("Vapotage", { exact: true }) })
      .locator("strong"),
  ).toContainText("0");
  await expect(
    page
      .locator(".recap-grid div")
      .filter({ has: page.getByText("Tabac", { exact: true }) })
      .locator("strong"),
  ).toContainText("—");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    JSON.stringify({
      nativeRevision: saved.revision,
      staleMutationRejected: true,
      newerTargetPreserved: true,
      zeroPersistedWithoutEvent: true,
      missingDataRemainUnknown: true,
      errors,
    }),
  );
} finally {
  await browser.close();
}
