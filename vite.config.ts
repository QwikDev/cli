import { defineConfig } from "vite-plus";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/router.ts", "bin/qwik.ts", "bin/create-qwik.ts"],
    format: ["esm", "cjs"],
    target: "node20",
    clean: true,
    dts: false,
    define: {
      QWIK_VERSION: JSON.stringify(pkg.version),
    },
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", "stubs/**", "specs/**"],
    rules: {
      "no-unused-vars": "error",
      "no-console": "off",
    },
  },
  fmt: {
    ignorePatterns: ["dist/**", "node_modules/**"],
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
  },
  test: {
    include: [
      "tests/unit/upgrade/**/*.spec.ts",
      "tests/unit/create-qwik/**/*.spec.ts",
    ],
  },
});
