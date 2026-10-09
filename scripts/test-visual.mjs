import { spawn } from "node:child_process";
const args = process.argv.slice(2);
if (process.env.CI && args.some((arg) => arg.startsWith("--update-snapshots")))
  throw Error("Baseline updates are forbidden in CI");
async function run(file, params) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...params], {
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
    process.once("SIGINT", () => child.kill("SIGINT"));
  });
  if (code !== 0) process.exit(code);
}
if (!args.includes("--skip-build")) {
  await run("scripts/check-docs.mjs", []);
  await run("node_modules/typescript/bin/tsc", ["-p", "tsconfig.docs.json"]);
  await run("node_modules/vitepress/bin/vitepress.js", ["build", "docs"]);
  await run("node_modules/@angular/cli/bin/ng.js", ["build"]);
  await run("scripts/storybook.mjs", ["build"]);
}
await run("node_modules/@playwright/test/cli.js", [
  "test",
  "--config",
  "playwright.visual.config.ts",
  ...args.filter((arg) => arg !== "--skip-build"),
]);
