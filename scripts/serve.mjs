import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
const root = path.resolve("dist/me-sim/browser");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
};
export const server = http
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
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      if (path.extname(file) === ".html") {
        const nonce = randomBytes(18).toString("base64");
        data = Buffer.from(
          data.toString().replaceAll("__TAURI_STYLE_NONCE__", nonce),
        );
        res.setHeader(
          "Content-Security-Policy",
          `default-src 'self'; script-src 'self'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data: blob:; connect-src 'self' blob:; font-src 'self'; object-src 'none'; frame-src 'none'`,
        );
      }
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] ?? "application/octet-stream",
      );
      res.end(data);
    });
  })
  .listen(Number(process.env.ME_SIM_PREVIEW_PORT || 1420), "127.0.0.1", () =>
    console.log(
      `Me-Sim preview: http://127.0.0.1:${process.env.ME_SIM_PREVIEW_PORT || 1420}`,
    ),
  );
