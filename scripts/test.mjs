import { spawn } from "node:child_process";
process.env.ME_SIM_PREVIEW_PORT = "1421";
const { server } = await import("./serve.mjs");
const child = spawn(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
child.on("exit", (code) => {
  server.closeAllConnections();
  server.close(() => process.exit(code ?? 1));
});
process.on("SIGINT", () => {
  child.kill();
  server.closeAllConnections();
  server.close();
});
