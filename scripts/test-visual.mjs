import { spawn } from "node:child_process";
const args = process.argv.slice(2);
if (process.env.CI && args.some((arg) => arg.startsWith("--update-snapshots")))
  throw Error("Baseline updates are forbidden in CI");

const children = new Set();
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    interrupted = true;
    for (const child of children) child.kill();
  });

/** @spec TECH-TOOLING-VALIDATION */
function spawnNode(file, params, options) {
  const child = spawn(process.execPath, [file, ...params], {
    windowsHide: true,
    ...options,
  });
  children.add(child);
  child.once("close", () => children.delete(child));
  return child;
}
/** @spec TECH-TOOLING-VALIDATION */
async function run(file, params, env = {}) {
  if (interrupted) throw Error("Validation interrupted");
  const code = await new Promise((resolve, reject) => {
    const child = spawnNode(file, params, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.once("error", reject);
    child.once("close", (value) => resolve(value ?? 1));
  });
  if (code !== 0) throw Error(`${file} exited with code ${code}`);
}
/** @spec TECH-TOOLING-VALIDATION */
async function startServer(file, marker, env = {}) {
  if (interrupted) throw Error("Validation interrupted");
  const child = spawnNode(file, [], {
    stdio: ["ignore", "pipe", "inherit"],
    env: { ...process.env, ...env },
  });
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(Error(`${file} did not start within 20 seconds`)),
      20_000,
    );
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      output += chunk;
      if (output.includes(marker)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      reject(Error(`${file} exited before startup (${code})`));
    });
  });
}
/** @spec TECH-TOOLING-VALIDATION */
async function stopChildren() {
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null)
            return resolve();
          const timer = setTimeout(resolve, 5_000);
          child.once("close", () => {
            clearTimeout(timer);
            resolve();
          });
          if (!child.kill()) {
            clearTimeout(timer);
            resolve();
          }
        }),
    ),
  );
}

try {
  if (!args.includes("--skip-build")) {
    await run("scripts/check-docs.mjs", []);
    await run("node_modules/typescript/bin/tsc", ["-p", "tsconfig.docs.json"]);
    await run("node_modules/vitepress/bin/vitepress.js", ["build", "docs"]);
    await run("node_modules/@angular/cli/bin/ng.js", ["build"]);
    await run("scripts/storybook.mjs", ["build"]);
  }
  // Keep these ports in sync with config/test-origins.ts.
  await startServer("scripts/serve-docs.mjs", "Documentation static:", {
    ME_SIM_DOCS_PORT: "4175",
  });
  await startServer("scripts/serve-storybook.mjs", "Storybook static:");
  await startServer("scripts/serve.mjs", "Me-Sim preview:", {
    ME_SIM_PREVIEW_PORT: "1423",
  });
  await run(
    "node_modules/@playwright/test/cli.js",
    [
      "test",
      "--config",
      "playwright.visual.config.ts",
      ...args.filter((arg) => arg !== "--skip-build"),
    ],
    { ME_SIM_VISUAL_SERVERS_MANAGED: "1" },
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await stopChildren();
}
