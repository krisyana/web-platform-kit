import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
// jscodeshift ships no ESM types for its test utils; the transform itself is plain CJS.
const require = createRequire(import.meta.url);
const jscodeshift = require("jscodeshift");
const transform = require("./button-loading-to-busy.cjs");

const run = (source: string) => transform({ path: "test.tsx", source }, { jscodeshift: jscodeshift.withParser("tsx"), report: () => {} }, {}) as string | null;

describe("button-loading-to-busy codemod", () => {
  it("renames loading to busy on Button imported from @kit/ui, keeping the value expression", () => {
    const out = run(`import { Button } from "@kit/ui";\nexport const A = () => <><Button loading>Save</Button><Button loading={saving} variant="danger">X</Button></>;`)!;
    expect(out).toContain("<Button busy>Save</Button>");
    expect(out).toContain('<Button busy={saving} variant="danger">X</Button>');
    expect(out).not.toContain("loading");
  });
  it("respects import aliases", () => {
    expect(run(`import { Button as KitButton } from "@kit/ui";\nconst a = <KitButton loading />;`)).toContain("<KitButton busy />");
  });
  it("leaves other components named Button, and files without the import, untouched", () => {
    expect(run(`import { Button } from "other-lib";\nconst a = <Button loading />;`)).toBeNull();
    expect(run(`const a = <Button loading />;`)).toBeNull();
  });
  it("does not touch non-Button components from @kit/ui or other props", () => {
    expect(run(`import { Button, Input } from "@kit/ui";\nconst a = <><Input loading /><Button disabled /></>;`)).toBeNull();
  });
  it("skips elements that already have busy (conflict) and reports it", () => {
    const reports: string[] = [];
    const out = transform({ path: "t.tsx", source: `import { Button } from "@kit/ui";\nconst a = <Button loading busy />;` }, { jscodeshift: jscodeshift.withParser("tsx"), report: (m: string) => reports.push(m) }, {});
    expect(out).toBeNull(); expect(reports[0]).toMatch(/fix manually/);
  });
  it("handles aliased imports without a local rename and is idempotent", () => {
    const once = run(`import { Button } from "@kit/ui";\nconst a = <Button loading />;`)!;
    expect(run(once)).toBeNull();
  });
});
