import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

test(
  "documentation preview binds only to loopback and serves clean paths safely",
  { timeout: 15_000 },
  async (t) => {
    const child = spawn(process.execPath, ["scripts/serve-docs.mjs"], {
      env: { ...process.env, ME_SIM_DOCS_PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    t.after(async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      await new Promise((resolve) => {
        child.once("close", resolve);
        if (!child.kill()) resolve();
      });
    });
    const origin = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () => reject(Error("Preview did not start")),
        10_000,
      );
      child.stdout.on("data", (chunk) => {
        output += chunk;
        const match = output.match(
          /Documentation static: (http:\/\/127\.0\.0\.1:\d+)/,
        );
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        reject(Error(`Preview exited (${code})`));
      });
    });
    for (const route of [
      "/",
      "/en/",
      "/getting-started",
      "/en/getting-started",
    ]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type"), /^text\/html/);
      assert.match(await response.text(), /Me-Sim/);
    }
    assert.equal((await fetch(origin + "/not-a-page")).status, 404);
    assert.equal((await fetch(origin + "/..%2f..%2fpackage.json")).status, 403);
    assert.equal((await fetch(origin + "/", { method: "POST" })).status, 405);
    assert.equal((await fetch(origin + "/", { method: "HEAD" })).status, 200);
  },
);
