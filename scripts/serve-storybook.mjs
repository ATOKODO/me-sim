import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("storybook-static");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(
      root,
      "." + (name === "/" ? "/index.html" : name),
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] ?? "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    });
  })
  .listen(6107, "127.0.0.1", () =>
    console.log("Storybook static: http://127.0.0.1:6107"),
  );
server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
for (const event of ["SIGINT", "SIGTERM"])
  process.on(event, () => {
    server.closeAllConnections();
    server.close();
  });
