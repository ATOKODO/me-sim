import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const avatarDir = join(project, "public", "avatar");
const manifestPath = join(avatarDir, "animations.json");
const metricSource = readFileSync(
  join(project, "src", "app", "core", "models.ts"),
  "utf8",
);
const source = ts.createSourceFile(
  "models.ts",
  metricSource,
  ts.ScriptTarget.Latest,
  true,
);
const modes = new Set(["idle"]);

function property(object, name) {
  return object.properties.find(
    (entry) =>
      ts.isPropertyAssignment(entry) && entry.name.getText(source) === name,
  );
}

function visit(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "METRICS" &&
    node.initializer &&
    ts.isArrayLiteralExpression(node.initializer)
  ) {
    for (const entry of node.initializer.elements) {
      if (!ts.isObjectLiteralExpression(entry)) continue;
      const id = property(entry, "id");
      const event = property(entry, "event");
      if (
        id &&
        event &&
        ts.isStringLiteral(id.initializer) &&
        event.initializer.kind === ts.SyntaxKind.TrueKeyword
      )
        modes.add(id.initializer.text);
    }
  }
  ts.forEachChild(node, visit);
}

visit(source);
if (modes.size <= 1) throw new Error("Aucune habitude trouvée dans METRICS.");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (
  manifest?.version !== 1 ||
  !manifest.overrides ||
  typeof manifest.overrides !== "object" ||
  Array.isArray(manifest.overrides)
)
  throw new Error("animations.json doit contenir version: 1 et overrides: {}.");

const errors = [];
const variants = [["default", manifest.overrides]];
if (manifest.variants !== undefined) {
  if (
    !manifest.variants ||
    typeof manifest.variants !== "object" ||
    Array.isArray(manifest.variants)
  )
    throw new Error("variants doit être un objet.");
  for (const [variant, value] of Object.entries(manifest.variants)) {
    if (
      variant !== "female" ||
      !value?.overrides ||
      typeof value.overrides !== "object" ||
      Array.isArray(value.overrides)
    )
      throw new Error("Variante d’avatar invalide : " + variant);
    variants.push([variant, value.overrides]);
  }
}
for (const [variant, overrides] of variants) {
  for (const [mode, config] of Object.entries(overrides)) {
    if (!modes.has(mode)) {
      errors.push(`${variant}/${mode} : habitude inconnue.`);
      continue;
    }
    if (
      !config ||
      typeof config !== "object" ||
      !/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(config.file) ||
      typeof config.clip !== "string" ||
      !config.clip.trim()
    ) {
      errors.push(`${mode} : file ou clip invalide.`);
      continue;
    }
    const file = join(avatarDir, config.file);
    if (!existsSync(file)) {
      errors.push(`${mode} : fichier absent (${config.file}).`);
      continue;
    }
    try {
      const bytes = readFileSync(file);
      if (
        bytes.length < 20 ||
        bytes.readUInt32LE(0) !== 0x46546c67 ||
        bytes.readUInt32LE(4) !== 2 ||
        bytes.readUInt32LE(8) !== bytes.length
      )
        throw new Error("en-tête GLB 2 invalide");
      const jsonLength = bytes.readUInt32LE(12);
      if (
        bytes.readUInt32LE(16) !== 0x4e4f534a ||
        20 + jsonLength > bytes.length
      )
        throw new Error("bloc JSON GLB invalide");
      const gltf = JSON.parse(
        bytes.subarray(20, 20 + jsonLength).toString("utf8"),
      );
      if (gltf.asset?.version !== "2.0" || !gltf.meshes?.length)
        throw new Error("modèle glTF 2 sans géométrie");
      if (
        !gltf.animations?.some(
          (animation) =>
            animation.name === config.clip && animation.channels?.length,
        )
      )
        throw new Error(`clip « ${config.clip} » absent ou vide`);
      for (const resource of [...(gltf.buffers ?? []), ...(gltf.images ?? [])])
        if (resource.uri && !resource.uri.startsWith("data:"))
          throw new Error(
            "ressource externe détectée : exporter en GLB autonome",
          );
      if (statSync(file).size > 20 * 1024 * 1024)
        console.warn(
          `${variant}/${mode} : fichier supérieur à 20 Mo ; vérifier la fluidité.`,
        );
      console.log(`${variant}/${mode} : ${config.file} · ${config.clip} ✓`);
    } catch (error) {
      errors.push(`${mode} : ${error.message}.`);
    }
  }
}
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `Manifeste valide : ${variants.reduce((count, [, overrides]) => count + Object.keys(overrides).length, 0)} animation(s) GLB, ${variants.length} variante(s).`,
  );
}
