import { describe, expect, it } from "vitest";
import { cleanPackageJson } from "../../../src/create-qwik/create-app.js";

describe("cleanPackageJson", () => {
  it("removes __qwik__ metadata key from input object", () => {
    const input = {
      name: "my-app",
      __qwik__: { displayName: "Empty App", priority: 1 },
    };
    const result = cleanPackageJson(input);
    expect(result).not.toHaveProperty("__qwik__");
  });

  it("preserves allowlist fields in order", () => {
    const input = {
      name: "my-app",
      version: "1.0.0",
      description: "test",
      scripts: { build: "vite build" },
      dependencies: { react: "^18" },
      devDependencies: { typescript: "^5" },
      main: "./dist/index.js",
      qwik: "./dist/index.qwik.mjs",
      module: "./dist/index.mjs",
      types: "./dist/index.d.ts",
      exports: { ".": "./dist/index.mjs" },
      files: ["dist"],
      engines: { node: ">=18" },
    };
    const result = cleanPackageJson(input);
    const keys = Object.keys(result);
    const allowlist = [
      "name",
      "version",
      "description",
      "scripts",
      "dependencies",
      "devDependencies",
      "main",
      "qwik",
      "module",
      "types",
      "exports",
      "files",
      "engines",
    ];
    for (const key of allowlist) {
      expect(keys).toContain(key);
    }
    // Check order: name comes before engines
    expect(keys.indexOf("name")).toBeLessThan(keys.indexOf("engines"));
  });

  it("appends non-allowlist, non-__qwik__ keys sorted alphabetically after allowlist keys", () => {
    const input = {
      name: "my-app",
      zebra: "z",
      alpha: "a",
      middle: "m",
    };
    const result = cleanPackageJson(input);
    const keys = Object.keys(result);
    // Allowlist keys come first (name)
    expect(keys[0]).toBe("name");
    // Extra keys sorted alphabetically after allowlist
    const extraKeys = keys.slice(keys.indexOf("name") + 1);
    // engines should be added as default
    const nonEngineExtra = extraKeys.filter((k) => k !== "engines");
    expect(nonEngineExtra).toEqual(["alpha", "middle", "zebra"]);
  });

  it("adds default engines if missing", () => {
    const input = { name: "my-app" };
    const result = cleanPackageJson(input);
    expect(result.engines).toEqual({ node: "^18.17.0 || ^20.3.0 || >=21.0.0" });
  });

  it("does not add engines if already present", () => {
    const input = {
      name: "my-app",
      engines: { node: ">=20" },
    };
    const result = cleanPackageJson(input);
    expect(result.engines).toEqual({ node: ">=20" });
  });
});
