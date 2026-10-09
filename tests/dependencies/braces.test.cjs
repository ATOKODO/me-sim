const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createRequire } = require("node:module");
const { execFileSync } = require("node:child_process");
const braces = require("braces");

test("every locked braces consumer resolves the checked local patch", () => {
  const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
  assert.equal(lock.packages["node_modules/braces"].link, true);
  assert.equal(lock.packages["vendor/braces"].version, "3.0.3-me-sim.1");
  assert.equal(require("braces/package.json").version, "3.0.3-me-sim.1");
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (name.endsWith("/node_modules/braces") || name === "node_modules/braces")
      assert.equal(entry.link, true, name);
  }
  const consumer = createRequire(require.resolve("http-proxy-middleware"))(
    "micromatch",
  );
  assert.deepEqual(consumer.braces("api/{read,write}"), ["api/(read|write)"]);
  assert.throws(
    () => consumer.braces("{".repeat(512) + "x" + "}".repeat(512)),
    SyntaxError,
  );
});

test("ordinary brace, range, escaped and parenthesis patterns retain behavior", () => {
  assert.deepEqual(braces("src/{core,ui}/*.ts"), ["src/(core|ui)/*.ts"]);
  assert.deepEqual(braces.expand("file-{1..3}.csv"), [
    "file-1.csv",
    "file-2.csv",
    "file-3.csv",
  ]);
  assert.deepEqual(braces.expand("{a,{b,c}}"), ["a", "b", "c"]);
  assert.equal(braces.stringify(braces.parse("a/{b,c}/d")), "a/{b,c}/d");
  assert.equal(braces.compile(braces.parse("x/{a,b}")), "x/(a|b)");
  assert.deepEqual(braces("\\{literal\\}"), ["{literal}"]);
  assert.doesNotThrow(() => braces("(" + "{a,b}" + ")"));
  assert.doesNotThrow(() =>
    braces.compile(braces.parse("{".repeat(32) + "a,b" + "}".repeat(32))),
  );
});

test("deep brace/parenthesis strings fail predictably before recursive walkers", () => {
  for (const [open, close] of [
    ["{", "}"],
    ["(", ")"],
  ]) {
    const payload = open.repeat(4000) + "x" + close.repeat(4000);
    for (const fn of [
      braces,
      braces.parse,
      braces.compile,
      braces.expand,
      braces.stringify,
    ]) {
      assert.throws(
        () => fn(payload, { maxLength: Infinity, maxDepth: Infinity }),
        { name: "SyntaxError", message: /safe nesting/ },
      );
    }
  }
});

test("direct AST inputs and internal entry points cannot bypass depth or cycle checks", () => {
  const deep = { type: "root", nodes: [] };
  let tip = deep;
  for (let i = 0; i < 512; i++) {
    const next = { type: "brace", nodes: [] };
    tip.nodes.push(next);
    tip = next;
  }
  const cyclic = { type: "root", nodes: [] };
  cyclic.nodes.push(cyclic);
  const parentCycle = { type: "paren", nodes: [{ type: "text", value: "x" }] };
  parentCycle.parent = parentCycle;
  const wide = {
    type: "root",
    nodes: new Array(131073).fill({ type: "text", value: "x" }),
  };
  for (const name of ["compile", "expand", "stringify"]) {
    for (const fn of [
      braces[name],
      require("../../vendor/braces/lib/" + name),
    ]) {
      assert.throws(() => fn(deep), SyntaxError);
      assert.throws(() => fn(cyclic), SyntaxError);
      assert.throws(() => fn(parentCycle), SyntaxError);
      assert.throws(() => fn(wide), SyntaxError);
    }
  }
});

test("a consumer can reject oversized patterns and keep using the patched parser", () => {
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      `
    const braces=require('braces');
    try { braces('{'.repeat(4000)+'x'+'}'.repeat(4000)); process.exitCode=1; }
    catch(error) { if(error.name!=='SyntaxError') throw error; console.log('rejected'); }
    console.log(braces.compile('safe/{a,b}'));
  `,
    ],
    { cwd: process.cwd(), timeout: 5000, encoding: "utf8" },
  );
  assert.equal(output.trim(), "rejected\nsafe/(a|b)");
});
