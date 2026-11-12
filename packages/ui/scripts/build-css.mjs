// Generates dist/styles.css = tokens (from tokens.json) + component CSS.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";

const tokens = JSON.parse(readFileSync("src/tokens.json", "utf8"));
const decl = (o, indent = "  ") => Object.entries(o).map(([k, v]) => `${indent}--kit-${k}: ${v};`).join("\n");

const css = [
  `:root {\n${decl(tokens.shared)}\n${decl(tokens.light)}\n  color-scheme: light;\n}`,
  `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${decl(tokens.dark, "    ")}\n    color-scheme: dark;\n  }\n}`,
  `:root[data-theme="light"] {\n${decl(tokens.light)}\n  color-scheme: light;\n}`,
  `:root[data-theme="dark"] {\n${decl(tokens.dark)}\n  color-scheme: dark;\n}`,
];
const dir = "src/styles";
for (const f of readdirSync(dir).filter((f) => f.endsWith(".css")).sort()) css.push(readFileSync(`${dir}/${f}`, "utf8"));

mkdirSync("dist", { recursive: true });
writeFileSync("dist/styles.css", css.join("\n\n") + "\n");
console.log("wrote dist/styles.css");

// Rollup drops module directives while bundling; re-add "use client" so the package works in Next.js Server Component trees.
for (const f of ["dist/index.js", "dist/index.cjs"]) {
  const src = readFileSync(f, "utf8");
  if (!src.startsWith('"use client"')) writeFileSync(f, `"use client";\n${src}`);
}
