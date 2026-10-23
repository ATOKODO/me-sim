import {
  METRICS,
  applySyncResult,
  habitOperation,
  localDate,
  localTime,
  observationOperation,
} from "./data.mjs";
import {
  addOperation,
  allOperations,
  deleteOperation,
  getSetting,
  putSetting,
  replaceOperation,
  updateOperations,
} from "./db.mjs";

const $ = (id) => document.getElementById(id);
const state = {
  token: null,
  deviceId: null,
  profiles: [],
  activeProfileId: null,
  pending: [],
  syncing: false,
};

function notice(message, error = false) {
  const node = $("message");
  node.textContent = message;
  node.classList.toggle("error", error);
  node.classList.remove("hidden");
}

function connection(connected = false) {
  const node = $("connection");
  node.textContent = connected
    ? "PC connecté"
    : navigator.onLine
      ? "PC non connecté"
      : "Hors ligne";
  node.classList.toggle("online", connected);
}

function selectedProfile() {
  return state.profiles.find((profile) => profile.id === state.activeProfileId);
}

function profileName(id) {
  return (
    state.profiles.find((profile) => profile.id === id)?.name ??
    "Profil indisponible"
  );
}

function renderProfiles() {
  const select = $("profile-select");
  select.replaceChildren();
  for (const profile of state.profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    select.append(option);
  }
  if (!state.profiles.some((profile) => profile.id === state.activeProfileId)) {
    state.activeProfileId = state.profiles[0]?.id ?? null;
  }
  select.value = state.activeProfileId ?? "";
  $("pair-panel").classList.toggle("hidden", Boolean(state.token));
  $("capture-panel").classList.toggle(
    "hidden",
    !state.token || !state.profiles.length,
  );
  $("sync-panel").classList.toggle("hidden", !state.token);
  renderHabits();
  renderQueue();
}

function activeHabits() {
  const date = $("habit-date").value;
  return (selectedProfile()?.habits ?? []).filter(
    (habit) =>
      habit.startDate <= date && (!habit.archivedAt || habit.archivedAt > date),
  );
}

function renderHabits() {
  const list = $("habit-list");
  list.replaceChildren();
  const habits = activeHabits();
  $("no-habits").classList.toggle("hidden", habits.length > 0);
  for (const habit of habits) {
    const latest = [...state.pending]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .findLast(
        (item) =>
          item.kind === "habit-answer" &&
          item.profileId === state.activeProfileId &&
          item.payload.habitId === habit.id &&
          item.payload.date === $("habit-date").value,
      );
    const row = document.createElement("div");
    row.className = "habit-row";
    const title = document.createElement("div");
    title.className = "habit-label";
    title.textContent = habit.label;
    const kind = document.createElement("span");
    kind.className = "habit-kind";
    kind.textContent = habit.kind === "good" ? "À cultiver" : "À réduire";
    title.append(kind);
    row.append(title);
    for (const [answer, label] of [
      [true, "Oui"],
      [false, "Non"],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", `${habit.label} : ${label}`);
      button.classList.toggle("selected", latest?.payload.answer === answer);
      button.addEventListener("click", () => saveHabit(habit.id, answer));
      row.append(button);
    }
    list.append(row);
  }
}

function renderQueue() {
  $("pending-badge").textContent = `${state.pending.length} en attente`;
  $("sync-button").disabled =
    state.syncing || !state.pending.some((operation) => !operation.status);
  const list = $("queue-list");
  list.replaceChildren();
  for (const operation of [...state.pending].reverse().slice(0, 30)) {
    const row = document.createElement("div");
    row.className = "queue-row";
    const detail = document.createElement("div");
    const title = document.createElement("strong");
    const metric = METRICS.find(
      (entry) => entry.id === operation.payload.metric,
    );
    title.textContent =
      operation.kind === "observation"
        ? `${metric?.label ?? operation.payload.metric} · ${operation.payload.value} ${metric?.unit ?? ""}`
        : `Habitude · ${operation.payload.answer ? "Oui" : "Non"}`;
    const subtitle = document.createElement("span");
    subtitle.textContent =
      `${profileName(operation.profileId)} · ${operation.payload.date}` +
      (operation.status
        ? ` · ${operation.reason ?? operation.status}`
        : " · À envoyer");
    detail.append(title, subtitle);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Retirer";
    remove.setAttribute(
      "aria-label",
      `Retirer ${title.textContent} de la file locale`,
    );
    remove.addEventListener("click", async () => {
      if (!confirm("Retirer cette saisie locale non synchronisée ?")) return;
      try {
        await deleteOperation(operation.id);
        state.pending = state.pending.filter(
          (item) => item.id !== operation.id,
        );
        renderQueue();
        renderHabits();
      } catch {
        notice("Impossible de modifier la file locale.", true);
      }
    });
    row.append(detail, remove);
    list.append(row);
  }
}

function renderMetric() {
  const metric = METRICS.find((entry) => entry.id === $("metric").value);
  if (!metric) return;
  $("metric-unit").textContent = `(${metric.unit})`;
  $("value").min = metric.min ?? 0;
  $("value").max = metric.max;
  $("value").step = metric.integer ? "1" : "0.1";
  $("time-row").classList.toggle("hidden", !metric.event);
  $("observation-time").required = Boolean(metric.event);
}

async function queue(operation, previousId = null) {
  if (!previousId && state.pending.length >= 2000)
    throw new Error(
      "Limite de 2 000 saisies en attente atteinte. Reconnecte le PC avant de continuer.",
    );
  if (previousId) {
    await replaceOperation(previousId, operation);
    state.pending = state.pending.filter((item) => item.id !== previousId);
  } else {
    await addOperation(operation);
  }
  state.pending.push(operation);
  renderQueue();
  renderHabits();
  // Storage persistence is a browser request, not a guarantee. Never discard unsent records.
  navigator.storage?.persist?.().catch(() => {});
  notice("Enregistré sur ce téléphone. La synchronisation attend le PC.");
  if (state.token && navigator.onLine) void sync(true);
}

async function saveHabit(habitId, answer) {
  try {
    if (!selectedProfile()) throw new Error("Choisis un profil.");
    const date = $("habit-date").value;
    const previous =
      !state.syncing &&
      state.pending.findLast(
        (item) =>
          item.kind === "habit-answer" &&
          !item.status &&
          item.profileId === state.activeProfileId &&
          item.payload.date === date &&
          item.payload.habitId === habitId,
      );
    await queue(
      habitOperation({
        id: crypto.randomUUID(),
        profileId: state.activeProfileId,
        habitId,
        date,
        answer,
        createdAt: new Date().toISOString(),
      }),
      previous?.id,
    );
  } catch (error) {
    notice(`Saisie non enregistrée : ${error.message}`, true);
  }
}

async function api(path, options = {}) {
  if (!window.isSecureContext) {
    throw new Error("Ouvre l’adresse HTTPS du PC avant d’associer ou de synchroniser ce téléphone.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, {
      ...options,
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        body.message || `Réponse du PC : ${response.status}`,
      );
      error.status = response.status;
      if (
        response.status === 401 &&
        state.token &&
        path !== "/api/companion/pair"
      ) {
        state.token = null;
        await putSetting("token", null);
        renderProfiles();
        notice(
          "Accès du téléphone révoqué. Réassocie-le sur le PC ; tes saisies locales restent en attente.",
          true,
        );
      }
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function refreshBootstrap() {
  const body = await api("/api/companion/bootstrap");
  if (!Array.isArray(body.profiles)) throw new Error("Réponse du PC invalide.");
  state.profiles = body.profiles;
  await putSetting("profiles", state.profiles);
  renderProfiles();
  connection(true);
}

async function sync(silent = false) {
  if (!state.token || state.syncing) return;
  const candidates = state.pending
    .filter((operation) => !operation.status)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!candidates.length) return;
  state.syncing = true;
  renderQueue();
  try {
    // Bounded batches keep one interruption from losing progress or duplicating a large queue.
    for (let offset = 0; offset < candidates.length; offset += 50) {
      const operations = candidates.slice(offset, offset + 50);
      const result = await api("/api/companion/sync", {
        method: "POST",
        body: JSON.stringify({ deviceId: state.deviceId, operations }),
      });
      if (
        !Array.isArray(result.accepted) ||
        !Array.isArray(result.conflicts) ||
        !Array.isArray(result.rejected)
      ) {
        throw new Error("Accusé de réception invalide.");
      }
      const sentIds = new Set(operations.map((operation) => operation.id));
      const outcomes = [
        ...result.accepted,
        ...result.conflicts.map((item) => item.id),
        ...result.rejected.map((item) => item.id),
      ];
      if (
        outcomes.length !== new Set(outcomes).size ||
        outcomes.some((id) => !sentIds.has(id))
      ) {
        throw new Error("Accusé de réception incohérent.");
      }
      const acknowledged = result.accepted ?? [];
      const unresolved = applySyncResult(operations, result);
      await updateOperations(unresolved, acknowledged);
      const outcome = new Map(
        unresolved.map((operation) => [operation.id, operation]),
      );
      state.pending = state.pending
        .filter((operation) => !acknowledged.includes(operation.id))
        .map((operation) => outcome.get(operation.id) ?? operation);
      renderQueue();
    }
    $("last-sync").textContent =
      `Dernière connexion : ${new Date().toLocaleString("fr-FR")}`;
    notice(
      state.pending.length
        ? "Synchronisation terminée. Vérifie les éléments encore en attente."
        : "Toutes les saisies ont été reçues par le PC.",
    );
    await refreshBootstrap();
  } catch (error) {
    connection(false);
    if (error.status !== 401 && !silent)
      notice(
        `PC inaccessible ou synchronisation interrompue. Tes saisies restent sur le téléphone. ${error.message}`,
        true,
      );
  } finally {
    state.syncing = false;
    renderQueue();
  }
}

function setTab(habit) {
  $("observation-panel").classList.toggle("hidden", habit);
  $("habit-panel").classList.toggle("hidden", !habit);
  for (const [id, selected] of [
    ["tab-habit", habit],
    ["tab-observation", !habit],
  ]) {
    $(id).classList.toggle("active", selected);
    $(id).setAttribute("aria-selected", String(selected));
  }
}

async function start() {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) {
    notice(
      "Installe d’abord le certificat local du PC et ouvre son adresse HTTPS. Le mode hors ligne exige une connexion sécurisée.",
      true,
    );
  } else {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() =>
        notice(
          "Le mode hors ligne ne peut pas être installé sur ce navigateur.",
          true,
        ),
      );
  }
  try {
    state.deviceId = (await getSetting("deviceId")) ?? crypto.randomUUID();
    await putSetting("deviceId", state.deviceId);
    state.token = (await getSetting("token")) ?? null;
    state.profiles = (await getSetting("profiles")) ?? [];
    state.activeProfileId = (await getSetting("activeProfileId")) ?? null;
    state.pending = await allOperations();
  } catch {
    notice(
      "Stockage local indisponible : aucune saisie ne peut être enregistrée.",
      true,
    );
    return;
  }
  connection();
  $("observation-date").value = localDate();
  $("habit-date").value = localDate();
  $("observation-time").value = localTime();
  for (const metric of METRICS) {
    const option = document.createElement("option");
    option.value = metric.id;
    option.textContent = `${metric.label} · ${metric.unit}`;
    $("metric").append(option);
  }
  renderMetric();
  renderProfiles();
  if (state.token && navigator.onLine) {
    refreshBootstrap()
      .then(() => sync(true))
      .catch(() => connection(false));
  }
}

$("pair-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("pair-form").querySelector("button");
  button.disabled = true;
  try {
    const response = await api("/api/companion/pair", {
      method: "POST",
      body: JSON.stringify({
        code: $("pair-code").value.trim(),
        deviceId: state.deviceId,
        deviceName: $("device-name").value.trim(),
      }),
    });
    if (!response.token) throw new Error("Réponse d’association invalide.");
    state.token = response.token;
    await putSetting("token", state.token);
    await refreshBootstrap();
    notice(
      "Téléphone associé. Tu peux maintenant saisir des données hors ligne.",
    );
  } catch (error) {
    notice(`Association impossible : ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
});

$("observation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (!selectedProfile()) throw new Error("Choisis un profil.");
    const operation = observationOperation({
      id: crypto.randomUUID(),
      profileId: state.activeProfileId,
      metricId: $("metric").value,
      date: $("observation-date").value,
      at: $("observation-time").value,
      value: $("value").value,
      createdAt: new Date().toISOString(),
    });
    await queue(operation);
    $("value").value = "";
    $("observation-time").value = localTime();
  } catch (error) {
    notice(`Saisie non enregistrée : ${error.message}`, true);
  }
});

$("profile-select").addEventListener("change", async (event) => {
  state.activeProfileId = event.target.value;
  renderHabits();
  try {
    await putSetting("activeProfileId", state.activeProfileId);
  } catch {
    notice("Profil choisi non conservé pour la prochaine ouverture.", true);
  }
});
$("metric").addEventListener("change", renderMetric);
$("habit-date").addEventListener("change", renderHabits);
$("tab-habit").addEventListener("click", () => setTab(true));
$("tab-observation").addEventListener("click", () => setTab(false));
$("sync-button").addEventListener("click", () => sync());
window.addEventListener("online", () => {
  connection();
  sync(true);
});
window.addEventListener("offline", () => connection(false));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && navigator.onLine && state.token) {
    refreshBootstrap()
      .then(() => sync(true))
      .catch(() => connection(false));
  }
});
setInterval(() => {
  if (
    !document.hidden &&
    navigator.onLine &&
    state.token &&
    state.pending.some((operation) => !operation.status)
  ) {
    void sync(true);
  }
}, 30000);
start();
