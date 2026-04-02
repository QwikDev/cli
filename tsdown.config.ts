import { defineConfig } from "tsdown";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: ["src/index.ts", "src/router.ts", "bin/qwik.ts", "bin/create-qwik.ts"],
  format: ["esm", "cjs"],
  target: "node20",
  clean: true,
  dts: false,
  define: {
    QWIK_VERSION: JSON.stringify(pkg.version),
  },
});
