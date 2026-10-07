import { spawn } from "node:child_process";
const target = process.argv[2] === "build" ? "build-storybook" : "storybook";
const child = spawn(
  process.execPath,
  [
    "node_modules/@angular/cli/bin/ng.js",
    "run",
    "me-sim:" + target,
    ...process.argv.slice(3),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      STORYBOOK_DISABLE_TELEMETRY: "1",
      STORYBOOK_ENABLE_CRASH_REPORTS: "0",
      DO_NOT_TRACK: "1",
      NG_CLI_ANALYTICS: "false",
    },
  },
);
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
