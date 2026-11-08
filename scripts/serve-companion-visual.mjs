import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("companion");
const port = Number(process.env.ME_SIM_COMPANION_PORT || 6108);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const profiles = [
  {
    id: "visual-profile",
    name: "Camille",
    habits: [
      {
        id: "walking",
        label: "Marcher 20 minutes",
        kind: "good",
        startDate: "2020-01-01",
        archivedAt: null,
        metric: "walk",
      },
      {
        id: "reading",
        label: "Lire",
        kind: "good",
        startDate: "2020-01-01",
        archivedAt: null,
        metric: "reading",
      },
      {
        id: "screen-evening",
        label: "Réduire l’écran le soir",
        kind: "reduce",
        startDate: "2020-01-01",
        archivedAt: null,
        metric: "screen_evening",
      },
    ],
  },
];

/** @spec TECH-TOOLING-VALIDATION */
async function readJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return JSON.parse(raw || "{}");
}

/** @spec TECH-TOOLING-VALIDATION */
function json(response, status, body) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

/** @spec TECH-TOOLING-VALIDATION */
const server = http.createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  let url;
  try {
    url = new URL(request.url, `http://127.0.0.1:${port}`);
    url.pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/companion/bootstrap") {
    json(response, 200, { deviceId: "visual-device", profiles });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/companion/pair") {
    try {
      const input = await readJson(request);
      if (!input.deviceId || !input.deviceName || !input.code) {
        json(response, 400, { message: "Invalid visual pairing request" });
        return;
      }
      json(response, 200, { token: "visual-token" });
    } catch {
      json(response, 400, { message: "Invalid visual pairing request" });
    }
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/companion/sync") {
    try {
      const input = await readJson(request);
      json(response, 200, {
        accepted: (input.operations ?? []).map(({ id }) => id),
        conflicts: [],
        rejected: [],
      });
    } catch {
      json(response, 400, { message: "Invalid visual sync request" });
    }
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405).end();
    return;
  }
  if (url.pathname === "/companion") {
    response.writeHead(308, { Location: "/companion/" }).end();
    return;
  }
  if (!url.pathname.startsWith("/companion/")) {
    response.writeHead(404).end();
    return;
  }

  const relative = url.pathname.slice("/companion/".length) || "index.html";
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const data = await fs.readFile(file);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
    });
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Companion visual static: http://127.0.0.1:${port}`);
});
server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.closeAllConnections();
    server.close();
  });
