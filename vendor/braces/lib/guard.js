'use strict';
// Local remediation for GHSA-vfj7-8cjw-p6xm. See PATCH.md.
exports.MAX_DEPTH = 64;
exports.validate = ast => {
  const ancestors = new Set([ast]);
  let parent = ast && ast.parent;
  while (parent) {
    if (ancestors.has(parent) || ancestors.size > 128) throw new SyntaxError('Brace AST contains cyclic or oversized parent chain');
    ancestors.add(parent);
    parent = parent.parent;
  }
  const pending = [{node: ast, depth: 0}];
  const seen = new Set();
  let count = 0;
  while (pending.length) {
    const {node, depth} = pending.pop();
    if (!node || typeof node !== 'object') throw new TypeError('Invalid brace AST');
    if (depth > 128 || ++count > 131072 || seen.has(node)) {
      throw new SyntaxError('Brace AST exceeds safe depth or node limits');
    }
    seen.add(node);
    if (node.nodes) {
      if (!Array.isArray(node.nodes) || node.nodes.length > 131072 - count - pending.length) {
        throw new SyntaxError('Brace AST exceeds safe node limit');
      }
      for (const child of node.nodes) {
        if (child && child.parent && child.parent !== node) throw new SyntaxError('Invalid brace AST parent link');
        pending.push({node: child, depth: depth + 1});
      }
    }
  }
};
