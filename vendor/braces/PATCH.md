# Local security patch

Source: the unmodified npm `braces@3.0.3` archive from https://registry.npmjs.org/braces/-/braces-3.0.3.tgz (upstream https://github.com/micromatch/braces/tree/3.0.3). Archive SHA-256: `1cd18e862c8640b4568b1425a7df4ee030ff201d45b2da8f9f222d2987494ffc`. Original MIT LICENSE, authors and implementation are retained. This copy is private and is not published to npm.

Remediates GHSA-vfj7-8cjw-p6xm, for which no patched npm release was available on 9 October 2026. Both brace and parenthesis parsing stop at 64 AST blocks. Compile, expand and stringify validate the AST iteratively before recursive walking (depth 128, 131072 nodes, repeated/cyclic nodes rejected). User options cannot raise these ceilings. Ordinary patterns, ranges and escaping retain upstream behavior.

Changed files: `lib/parse.js`, `lib/compile.js`, `lib/expand.js`, `lib/stringify.js`; added `lib/guard.js`; private version/metadata in `package.json`. The root npm override applies this patch to every consumer. `npm run test:dependencies` verifies the actually resolved package and its middleware consumer, normal patterns, deep string patterns and caller-provided ASTs.

Local packages are not covered by the npm advisory database. A clean audit is therefore insufficient evidence for this patch: its tests and diff must also be reviewed. Replace this override with a verified upstream fixed release when available. Do not change the version to conceal an unpatched implementation.
