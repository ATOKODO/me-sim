/** Local-only servers reserved for Playwright visual checks. */
export const VISUAL_ORIGINS = {
  application: "http://127.0.0.1:1423",
  storybook: "http://127.0.0.1:6107",
  documentation: "http://127.0.0.1:4175",
} as const;
