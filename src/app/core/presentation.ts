export type Language = "fr" | "en";
export type Theme = "dark" | "light";
const KEY = "me-sim.appearance.v1";
/** Only presentation preferences are cached here; health data stays in the native database. */
export function readPresentation(): { language: Language; theme: Theme } {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      language: value?.language === "en" ? "en" : "fr",
      theme: value?.theme === "light" ? "light" : "dark",
    };
  } catch {
    return { language: "fr", theme: "dark" };
  }
}
export function applyPresentation(value: { language: Language; theme: Theme }) {
  document.documentElement.lang = value.language;
  document.documentElement.dataset["theme"] = value.theme;
  document.documentElement.style.colorScheme = value.theme;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Native settings remain authoritative if storage is unavailable. */
  }
}
