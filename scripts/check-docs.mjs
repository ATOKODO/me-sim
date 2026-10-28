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
const french = pages(root),
  english = pages(path.join(root, "en"));
if (JSON.stringify(french) !== JSON.stringify(english))
  throw Error(
    "Each documentation page needs a French source and matching English translation.",
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
for (const name of french) {
  if (
    JSON.stringify(sections(path.join(root, name))) !==
    JSON.stringify(sections(path.join(root, "en", name)))
  )
    throw Error(
      `Section anchors differ between locales: ${name}. Update both translations and preserve explicit heading IDs.`,
    );
}
console.log(
  `Documentation: ${french.length} pages per language; matching FR/EN section anchors.`,
);
