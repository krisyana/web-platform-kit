import { defineConfig } from "tsup";
export default defineConfig({ entry: { index: "src/index.ts", collector: "src/collector.ts" }, format: ["esm", "cjs"], dts: true, clean: true, treeshake: true, external: ["react"] });
