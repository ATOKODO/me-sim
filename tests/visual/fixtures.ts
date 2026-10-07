import { test as base, expect } from "@playwright/test";
export const test = base.extend<{ localOnly: void }>({
  localOnly: [
    async ({ page }, use) => {
      const errors: string[] = [],
        external: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (
          ["http:", "https:"].includes(url.protocol) &&
          !["http://127.0.0.1:6107", "http://127.0.0.1:1422"].includes(
            url.origin,
          )
        ) {
          external.push(url.href);
          return route.abort();
        }
        return route.continue();
      });
      await use();
      expect(errors, "No JavaScript errors in the rendered UI").toEqual([]);
      expect(
        external,
        "No external requests from stories or the application",
      ).toEqual([]);
    },
    { auto: true },
  ],
});
