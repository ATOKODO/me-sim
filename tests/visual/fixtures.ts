import { test as base, expect } from "@playwright/test";
import { VISUAL_ORIGINS } from "../../config/test-origins";
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
          !(Object.values(VISUAL_ORIGINS) as string[]).includes(url.origin)
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
