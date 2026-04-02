import { defineConfig } from "vite-plus";

export default defineConfig({
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
    include: ["tests/unit/upgrade/**/*.spec.ts", "tests/unit/create-qwik/**/*.spec.ts"],
  },
});
