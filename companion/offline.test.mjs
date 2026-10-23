import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

test(
  "capture remains in the offline PWA after reload and only disappears after PC acknowledgement",
  { timeout: 40000 },
  async () => {
    let revoked = false;
    const server = createServer(async (request, response) => {
      response.setHeader("Cache-Control", "no-store");
      if (
        revoked &&
        request.url?.startsWith("/api/companion/") &&
        request.url !== "/api/companion/pair"
      ) {
        response.writeHead(401, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ message: "Appareil révoqué" }));
        return;
      }
      if (request.url === "/api/companion/pair") {
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ token: "test-token" }));
        return;
      }
      if (request.url === "/api/companion/bootstrap") {
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            deviceId: "phone",
            profiles: [
              {
                id: "profile",
                name: "Moi",
                habits: [
                  {
                    id: "reading",
                    label: "Lire",
                    kind: "good",
                    startDate: "2020-01-01",
                    archivedAt: null,
                    metric: "reading",
                  },
                ],
              },
            ],
          }),
        );
        return;
      }
      if (request.url === "/api/companion/sync") {
        let body = "";
        for await (const chunk of request) body += chunk;
        const { operations } = JSON.parse(body);
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            accepted: operations.map(({ id }) => id),
            conflicts: [],
            rejected: [],
          }),
        );
        return;
      }
      const filename =
        request.url === "/companion/"
          ? "index.html"
          : request.url?.replace("/companion/", "");
      const safe = normalize(filename ?? "");
      if (!safe || safe.startsWith("..") || safe.includes("\\")) {
        response.writeHead(404).end();
        return;
      }
      try {
        const content = await readFile(join(root, safe));
        response.setHeader(
          "Content-Type",
          types[safe.slice(safe.lastIndexOf("."))] ??
            "application/octet-stream",
        );
        response.end(content);
      } catch {
        response.writeHead(404).end();
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    let browser;
    try {
      browser = await chromium.launch({
        channel: process.platform === "win32" ? "msedge" : undefined,
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${address.port}/companion/`);
      await page.locator("#device-name").fill("Téléphone test");
      await page.locator("#pair-code").fill("123456");
      await page.locator("#pair-form button").click();
      await page
        .locator("#capture-panel")
        .waitFor({ state: "visible", timeout: 5000 })
        .catch(async (error) => {
          throw new Error(
            `${error.message}\nPage: ${await page.locator("body").innerText()}\nErrors: ${errors.join("; ")}`,
          );
        });
      await page.evaluate(() =>
        navigator.serviceWorker.ready.then(
          () =>
            new Promise((resolve) => {
              if (navigator.serviceWorker.controller) return resolve();
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                resolve,
                { once: true },
              );
            }),
        ),
      );
      await context.setOffline(true);
      await page.locator("#metric").selectOption("weight");
      await page.locator("#value").fill("72.5");
      await page.locator("#observation-form button").click();
      await page.getByText("1 en attente").waitFor();
      await page.reload();
      await page.getByText("1 en attente").waitFor();
      assert.match(
        await page.locator("#queue-list").innerText(),
        /Poids · 72.5 kg/,
      );
      await page.locator("#tab-habit").click();
      await page.getByRole("button", { name: "Lire : Oui" }).click();
      await page.getByText("2 en attente").waitFor();
      await page.getByRole("button", { name: "Lire : Non" }).click();
      await page.getByText("Habitude · Non").waitFor();
      assert.match(
        await page.locator("#pending-badge").innerText(),
        /2 en attente/,
      );
      const cachedUrls = await page.evaluate(async () => {
        const cachesByName = await caches.keys();
        return (
          await Promise.all(
            cachesByName.map(async (name) =>
              (await (await caches.open(name)).keys()).map(
                (request) => request.url,
              ),
            ),
          )
        ).flat();
      });
      assert.ok(cachedUrls.every((url) => !url.includes("/api/companion/")));
      await context.setOffline(false);
      await page.getByText("0 en attente").waitFor();
      await page.locator("#tab-observation").click();
      await page.locator("#value").fill("73");
      await page.locator("#observation-form button").click();
      await page.waitForFunction(() => document.querySelector("#value").value === "");
      await page.getByText("0 en attente").waitFor();
      revoked = true;
      await page.locator("#value").fill("74");
      await page.locator("#observation-form button").click();
      await page.locator("#pair-panel").waitFor({ state: "visible" });
      const queued = await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const opening = indexedDB.open("me-sim-companion");
            opening.onerror = () => reject(opening.error);
            opening.onsuccess = () => {
              const request = opening.result
                .transaction("operations")
                .objectStore("operations")
                .getAll();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            };
          }),
      );
      assert.equal(queued.length, 1);
      await context.close();
    } finally {
      await browser?.close();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
