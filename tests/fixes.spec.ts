import { expect, Page, test } from "@playwright/test";
import type { Snapshot } from "../src/app/core/models";
function snapshot(): Snapshot {
  return {
    version: 1,
    profiles: [
      {
        id: "p",
        name: "Review test",
        birthDate: null,
        sex: null,
        heightCm: null,
        color: "#bde883",
        demo: false,
        target: null,
        habits: [],
      },
    ],
    observations: [],
    habitDays: [],
    batches: [],
    scenarios: [],
    runs: [],
    settings: {
      animations: false,
      jitter: false,
      language: "fr",
      theme: "dark",
    },
  };
}
async function native(page: Page, data = snapshot(), conflict = false) {
  await page.addInitScript(
    ({ data, conflict }) => {
      const fixture = {
        snapshot: data,
        revision: 0,
        conflict,
        mutations: [] as any[],
      };
      (window as any).__fixture = fixture;
      (window as any).isTauri = true;
      (window as any).__TAURI_INTERNALS__ = {
        invoke: async (command: string, args: any) => {
          if (command === "initial_state")
            return {
              snapshot: structuredClone(fixture.snapshot),
              revision: fixture.revision,
              storagePath: "C:\\Fictional\\tests.db",
              model: {
                enabled: false,
                id: "research",
                name: "Research",
                version: "0",
                status: "validation_pending",
                reasons: [],
                source: "",
                horizons: [],
              },
            };
          if (command === "mutate") {
            fixture.mutations.push(structuredClone(args));
            if (fixture.conflict) {
              fixture.conflict = false;
              fixture.revision++;
              fixture.snapshot.profiles[0].target = {
                sleepHours: 8,
                steps: 12000,
                activityMinutes: 30,
                exerciseMinutes: 30,
                walkMinutes: 30,
                socialMinutes: 90,
                screenMinutes: 90,
                gamingMinutes: 60,
                alcoholGlasses: 0,
                tobaccoCigarettes: 0,
                vapingMinutes: 0,
                eveningScreenMinutes: 60,
                sedentaryMinutes: 480,
              };
              fixture.snapshot.profiles[0].heightCm = 181;
              throw { code: "CONCURRENT_CHANGE", message: "Changed elsewhere" };
            }
            if (args.expectedRevision !== fixture.revision)
              throw { code: "CONCURRENT_CHANGE", message: "Changed elsewhere" };
            const o = args.operation;
            if (o.type === "saveProfile")
              fixture.snapshot.profiles = [
                ...fixture.snapshot.profiles.filter((p) => p.id !== o.value.id),
                o.value,
              ];
            if (o.type === "saveObservation")
              fixture.snapshot.observations = [
                ...fixture.snapshot.observations.filter(
                  (p) => p.id !== o.value.id,
                ),
                o.value,
              ];
            fixture.revision++;
            return {
              snapshot: structuredClone(fixture.snapshot),
              revision: fixture.revision,
            };
          }
          if (command === "choose_import")
            return {
              token: "book",
              filename: "tabac.csv",
              sheets: [
                {
                  name: "CSV",
                  headers: ["date", "value"],
                  rows: [["01/10/2026", "2"]],
                },
              ],
            };
          if (command === "preview_import") {
            if (
              args.mapping.metric !== "tobacco" ||
              args.mapping.unit !== "cigarette"
            )
              throw new Error("Incorrect import mapping");
            return {
              token: "preview",
              profileId: "p",
              filename: "tabac.csv",
              rows: [
                {
                  row: 2,
                  status: "new",
                  message: "Prêt à importer.",
                  observation: {
                    id: "t",
                    profileId: "p",
                    date: "2026-10-01",
                    metric: "tobacco",
                    value: 2,
                    unit: "cigarette",
                    source: "tabac.csv",
                    batchId: null,
                    at: null,
                    durationMinutes: null,
                  },
                },
              ],
            };
          }
          if (command === "commit_import") {
            if (args.expectedRevision !== fixture.revision)
              throw { code: "CONCURRENT_CHANGE", message: "Changed elsewhere" };
            fixture.snapshot.observations.push({
              id: "t",
              profileId: "p",
              date: "2026-10-01",
              metric: "tobacco",
              value: 2,
              unit: "cigarette",
              source: "tabac.csv",
              batchId: null,
              at: null,
              durationMinutes: null,
            });
            fixture.revision++;
            return {
              snapshot: structuredClone(fixture.snapshot),
              revision: fixture.revision,
            };
          }
          throw new Error("Unexpected command " + command);
        },
      };
    },
    { data, conflict },
  );
}
test.use({ timezoneId: "Europe/Paris" });
test("midnight opens the new day and advances the calendar across a month boundary", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-30T23:59:00+02:00") });
  await native(page);
  await page.goto("/#/habitudes");
  await expect(page.locator(".habit-check-panel h2")).toContainText(
    "30 septembre",
  );
  await page.clock.fastForward(120_000);
  await expect(page.locator(".habit-check-panel h2")).toContainText(
    "1 octobre",
  );
  await expect(
    page.locator('.habit-calendar-day[aria-label^="1 octobre"]'),
  ).toBeEnabled();
});
test("midnight preserves an explicitly selected historical day", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-30T23:59:00+02:00") });
  await native(page);
  await page.goto("/#/habitudes");
  await page.locator('.habit-calendar-day[aria-label^="29 septembre"]').click();
  await page.clock.fastForward(120_000);
  await expect(page.locator(".habit-check-panel h2")).toContainText(
    "29 septembre",
  );
});
test("timeline expires without a data mutation and recap does not reuse old activity or invent zero", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-01T12:00:00+02:00") });
  const data = snapshot();
  data.observations = [
    {
      id: "old",
      profileId: "p",
      date: "2026-09-20",
      metric: "activity",
      value: 90,
      unit: "min",
      source: "test",
      batchId: null,
    },
    {
      id: "walk",
      profileId: "p",
      date: "2026-09-30",
      metric: "walk",
      value: 30,
      unit: "min",
      source: "test",
      batchId: null,
      at: "12:01",
      durationMinutes: 30,
    },
  ];
  await native(page, data);
  await page.goto("/");
  await expect(page.locator(".timeline-event")).toHaveCount(1);
  await expect(
    page.locator(".recap-grid").getByText("90", { exact: false }),
  ).toHaveCount(0);
  await expect(page.locator(".recap-grid strong")).toHaveText(
    Array(9).fill(/—/),
  );
  await page.clock.fastForward(32 * 60_000);
  await expect(page.locator(".timeline-event")).toHaveCount(0);
});
test("zero-minute journal entry records a known zero without an event and count fractions are rejected", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-01T12:00:00+02:00") });
  await native(page);
  await page.goto("/#/journal");
  const metric = page.locator('select[formControlName="metric"]');
  const value = page.locator('input[formControlName="value"]');
  const save = page.getByRole("button", {
    name: "Ajouter au journal",
    exact: true,
  });
  await metric.selectOption("tobacco");
  await value.fill("0.5");
  await expect(save).toBeDisabled();
  await metric.selectOption("steps");
  await value.fill("10.5");
  await expect(save).toBeDisabled();
  await metric.selectOption("vaping");
  await value.fill("0");
  await page.locator('input[formControlName="time"]').fill("");
  await expect(save).toBeEnabled();
  await save.click();
  const entry = await page.evaluate(
    () => (window as any).__fixture.snapshot.observations[0],
  );
  expect(entry.value).toBe(0);
  expect(entry.at).toBeNull();
  expect(entry.durationMinutes).toBeNull();
  await page.getByRole("link", { name: "Mon aperçu", exact: true }).click();
  await expect(page.locator(".timeline-event")).toHaveCount(0);
  await expect(
    page
      .locator(".recap-grid div")
      .filter({ has: page.getByText("Vapotage", { exact: true }) })
      .locator("strong"),
  ).toContainText("0");
});
test("tobacco CSV without an explicit unit column can be mapped using cigarette", async ({
  page,
}) => {
  await native(page);
  await page.goto("/#/donnees");
  await page
    .getByRole("button", { name: "Choisir un fichier", exact: true })
    .click();
  await page
    .locator('select[formControlName="metric"]')
    .selectOption("tobacco");
  await page
    .locator('select[formControlName="unit"]')
    .selectOption("cigarette");
  await page
    .locator('select[formControlName="dateFormat"]')
    .selectOption("dmy");
  await page
    .getByRole("button", { name: "Vérifier les lignes", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "2 cigarette", exact: true }),
  ).toBeVisible();
});
test("profile conflict retains the name draft and an explicit retry preserves the newer Target and physical fields", async ({
  page,
}) => {
  await native(page, snapshot(), true);
  await page.goto("/#/profils");
  await page
    .getByRole("button", { name: "Modifier Review test", exact: true })
    .click();
  await page.getByLabel("Prénom ou pseudonyme").fill("My draft");
  const save = page.getByRole("button", {
    name: "Enregistrer",
    exact: true,
  });
  await save.click();
  await expect(page.getByRole("alert")).toContainText("brouillon est conservé");
  await expect(page.getByLabel("Prénom ou pseudonyme")).toHaveValue("My draft");
  expect(
    await page.evaluate(() => (window as any).__fixture.mutations.length),
  ).toBe(1);
  await save.click();
  const fixture = await page.evaluate(() => (window as any).__fixture);
  expect(fixture.mutations.map((m: any) => m.expectedRevision)).toEqual([0, 1]);
  expect(fixture.snapshot.profiles[0].name).toBe("My draft");
  expect(fixture.snapshot.profiles[0].target.steps).toBe(12000);
  expect(fixture.snapshot.profiles[0].heightCm).toBe(181);
});
test("Target conflict preserves the draft and merges unchanged fields from the current data", async ({
  page,
}) => {
  await native(page, snapshot(), true);
  await page.goto("/");
  await page.getByLabel("Pas cibles").fill("10000");
  const save = page.getByRole("button", {
    name: "Enregistrer ma cible",
    exact: true,
  });
  await save.click();
  await expect(page.getByRole("alert")).toContainText("brouillon est conservé");
  await expect(page.getByLabel("Pas cibles")).toHaveValue("10000");
  await save.click();
  const profile = await page.evaluate(
    () => (window as any).__fixture.snapshot.profiles[0],
  );
  expect(profile.target.steps).toBe(10000);
  expect(profile.target.socialMinutes).toBe(90);
  expect(profile.heightCm).toBe(181);
});

test("journal midnight keeps the quantity draft and advances only the default date", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-30T23:59:00+02:00") });
  await native(page);
  await page.goto("/#/journal");
  const value = page.locator('input[formControlName="value"]');
  const date = page.locator('input[formControlName="date"]');
  await value.fill("72.5");
  await page.clock.fastForward(120_000);
  await expect(value).toHaveValue("72.5");
  await expect(date).toHaveValue("2026-10-01");
  await date.fill("2026-09-20");
  await page.clock.fastForward(24 * 60 * 60_000);
  await expect(value).toHaveValue("72.5");
  await expect(date).toHaveValue("2026-09-20");
});
test("a concurrent import clears its stale preview, keeps mapping, and succeeds only after review", async ({
  page,
}) => {
  await native(page);
  await page.goto("/#/donnees");
  await page
    .getByRole("button", { name: "Choisir un fichier", exact: true })
    .click();
  await page
    .locator('select[formControlName="metric"]')
    .selectOption("tobacco");
  await page
    .locator('select[formControlName="unit"]')
    .selectOption("cigarette");
  await page
    .locator('select[formControlName="dateFormat"]')
    .selectOption("dmy");
  const preview = page.getByRole("button", {
    name: "Vérifier les lignes",
    exact: true,
  });
  await preview.click();
  await page.evaluate(() => {
    (window as any).__fixture.revision = 1;
  });
  await page
    .getByRole("button", {
      name: "Confirmer l’import dans Review test",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("rechargées");
  await expect(
    page.getByRole("heading", {
      name: "Vérifier avant d’ajouter",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator('select[formControlName="unit"]')).toHaveValue(
    "cigarette",
  );
  await preview.click();
  await page
    .getByRole("button", {
      name: "Confirmer l’import dans Review test",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("Import terminé");
  await page.getByRole("link", { name: "Mon journal", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "2 cigarette", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__fixture.revision)).toBe(2);
});
