import fs from "node:fs";
import path from "node:path";
import { createMarkdownRenderer } from "vitepress";

const root = path.resolve("docs");
/** @spec TECH-TOOLING-VALIDATION */
const pages = (folder) =>
  fs
    .readdirSync(folder)
    .filter((name) => name.endsWith(".md"))
    .sort();
const canonical = pages(root),
  legacy = pages(path.join(root, "en"));
if (JSON.stringify(canonical) !== JSON.stringify(legacy))
  throw Error(
    "Each canonical documentation page needs a matching legacy /en/ page.",
  );
const md = await createMarkdownRenderer(root, {
  headers: { level: [1, 2, 3] },
});
/** @spec TECH-TOOLING-VALIDATION */
const flatten = (nodes) =>
  nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
/** @spec TECH-TOOLING-VALIDATION */
function sections(file) {
  const env = {};
  md.render(fs.readFileSync(file, "utf8"), env);
  return flatten(env.headers ?? []).map(({ level, slug }) => ({ level, slug }));
}
for (const name of canonical) {
  if (
    JSON.stringify(sections(path.join(root, name))) !==
    JSON.stringify(sections(path.join(root, "en", name)))
  )
    throw Error(
      `Section anchors differ between documentation paths: ${name}. Update both copies and preserve explicit heading IDs.`,
    );
}
console.log(
  `Documentation: ${canonical.length} English pages per path; matching section anchors.`,
);
