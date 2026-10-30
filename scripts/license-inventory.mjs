// SPDX-License-Identifier: AGPL-3.0-only
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

/** @spec TECH-TOOLING-LICENSES */
const hash = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const npm = Object.entries(lock.packages)
  .filter(([location]) => location)
  .map(([location, entry]) => {
    const locked = entry.link ? lock.packages[entry.resolved] : entry;
    if (!locked) throw Error(`Unresolved local dependency: ${location}`);
    const file = path.join(location, "package.json");
    const installed = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file, "utf8"))
      : null;
    if (installed && installed.version !== locked.version)
      throw Error(`Installed version differs from lock: ${location}`);
    return {
      name:
        installed?.name || locked.name || location.split("node_modules/").pop(),
      version: locked.version,
      license: installed?.license || locked.license || null,
      development: !!locked.dev,
      optional: !!locked.optional,
      inspectedInstalledManifest: !!installed,
      location,
    };
  });
const metadata = JSON.parse(
  execFileSync(
    "cargo",
    [
      "metadata",
      "--locked",
      "--offline",
      "--format-version",
      "1",
      "--filter-platform",
      "x86_64-pc-windows-msvc",
      "--manifest-path",
      "src-tauri/Cargo.toml",
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  ),
);
const resolved = new Set(metadata.resolve.nodes.map((node) => node.id));
const cargo = metadata.packages
  .filter((pkg) => resolved.has(pkg.id) && pkg.source)
  .map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    license: pkg.license,
    repository: pkg.repository,
    source: `https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download`,
  }))
  .sort(
    (a, b) =>
      a.name.localeCompare(b.name, "en") ||
      a.version.localeCompare(b.version, "en"),
  );
if ([...npm, ...cargo].some((pkg) => !pkg.license))
  throw Error("Missing license declaration; manual review required.");
const result =
  JSON.stringify(
    {
      schemaVersion: 1,
      target: "x86_64-pc-windows-msvc",
      packageLockSha256: hash("package-lock.json"),
      cargoLockSha256: hash("src-tauri/Cargo.lock"),
      scope:
        "All npm lock entries (including development/optional platforms) and the resolved Windows Cargo graph, including build dependencies. Declarations are not a binary composition or compatibility proof.",
      npm,
      cargo,
    },
    null,
    2,
  ) + "\n";
const target = "licenses/dependencies.json";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== result)
    throw Error(
      "License inventory is stale; run npm run licenses:inventory and review changes.",
    );
} else {
  fs.mkdirSync("licenses", { recursive: true });
  fs.writeFileSync(target, result);
}
console.log(
  `License declarations: ${npm.length} npm entries, ${cargo.length} Windows Cargo packages; no missing declarations.`,
);
