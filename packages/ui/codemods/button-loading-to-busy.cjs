/**
 * Codemod for @kit/ui 0.2 -> 0.3: renames the `loading` prop of <Button> to `busy`.
 * Usage: npx jscodeshift --parser=tsx -t node_modules/@kit/ui/codemods/button-loading-to-busy.cjs "src/**\/*.tsx"
 * Only touches elements whose tag is `Button` imported from "@kit/ui" (aliases respected).
 * If an element already has `busy`, it is left alone and reported, since both props would conflict.
 */
module.exports = function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const locals = new Set();
  root.find(j.ImportDeclaration, { source: { value: "@kit/ui" } }).forEach((p) => {
    for (const s of p.node.specifiers ?? []) {
      if (s.type === "ImportSpecifier" && s.imported.name === "Button") locals.add(s.local ? s.local.name : "Button");
    }
  });
  if (locals.size === 0) return null;

  let changed = false;
  root.find(j.JSXOpeningElement).forEach((p) => {
    const n = p.node.name;
    if (n.type !== "JSXIdentifier" || !locals.has(n.name)) return;
    const attrs = p.node.attributes ?? [];
    const named = (name) => attrs.find((a) => a.type === "JSXAttribute" && a.name.name === name);
    const loading = named("loading");
    if (!loading) return;
    if (named("busy")) { api.report(`${file.path}: <${n.name}> has both loading and busy; fix manually`); return; }
    loading.name.name = "busy";
    changed = true;
  });
  return changed ? root.toSource() : null;
};
