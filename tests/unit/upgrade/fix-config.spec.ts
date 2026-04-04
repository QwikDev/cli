import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  fixJsxImportSource,
  fixModuleResolution,
  fixPackageType,
} from "../../../migrations/v2/fix-config.ts";

// Helper to create a temp directory for testing
function withTempDir(callback: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "fix-config-test-"));
  try {
    callback(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// -----------------------------------------------------------------------
// CONF-01: fixJsxImportSource
// -----------------------------------------------------------------------

describe("fixJsxImportSource - CONF-01: rewrites @builder.io/qwik to @qwik.dev/core", () => {
  it("rewrites jsxImportSource from @builder.io/qwik to @qwik.dev/core", () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      writeFileSync(
        tsconfig,
        JSON.stringify(
          {
            compilerOptions: {
              jsxImportSource: "@builder.io/qwik",
            },
          },
          null,
          2,
        ),
      );

      fixJsxImportSource(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toContain("@qwik.dev/core");
      expect(result).not.toContain("@builder.io/qwik");
    });
  });
});

describe("fixJsxImportSource - CONF-01 idempotent: already @qwik.dev/core produces no file write", () => {
  it("does not modify the file when jsxImportSource is already @qwik.dev/core", () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      const content = JSON.stringify(
        {
          compilerOptions: {
            jsxImportSource: "@qwik.dev/core",
          },
        },
        null,
        2,
      );
      writeFileSync(tsconfig, content);

      fixJsxImportSource(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toBe(content);
    });
  });
});

describe("fixJsxImportSource - CONF-01 JSONC: block comments are preserved", () => {
  it("preserves block comments in tsconfig with jsxImportSource rewrite", () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      const content = `{
  /* TypeScript configuration */
  "compilerOptions": {
    "jsxImportSource": "@builder.io/qwik"
  }
}`;
      writeFileSync(tsconfig, content);

      fixJsxImportSource(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toContain("/* TypeScript configuration */");
      expect(result).toContain("@qwik.dev/core");
      expect(result).not.toContain("@builder.io/qwik");
    });
  });
});

describe("fixJsxImportSource - CONF-01 missing file: silently returns when tsconfig.json absent", () => {
  it("does not throw when tsconfig.json does not exist", () => {
    withTempDir((dir) => {
      expect(() => fixJsxImportSource(dir)).not.toThrow();
    });
  });
});

// -----------------------------------------------------------------------
// CONF-02: fixModuleResolution
// -----------------------------------------------------------------------

describe("fixModuleResolution - CONF-02: rewrites Node/Node16 to Bundler", () => {
  it('rewrites moduleResolution "Node" to "Bundler"', () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      writeFileSync(
        tsconfig,
        JSON.stringify({ compilerOptions: { moduleResolution: "Node" } }, null, 2),
      );

      fixModuleResolution(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toContain('"Bundler"');
      expect(result).not.toContain('"Node"');
    });
  });

  it('rewrites moduleResolution "Node16" to "Bundler"', () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      writeFileSync(
        tsconfig,
        JSON.stringify({ compilerOptions: { moduleResolution: "Node16" } }, null, 2),
      );

      fixModuleResolution(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toContain('"Bundler"');
      expect(result).not.toContain('"Node16"');
    });
  });

  it('rewrites case-insensitive "node" to "Bundler"', () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      const content = `{\n  "compilerOptions": {\n    "moduleResolution": "node"\n  }\n}`;
      writeFileSync(tsconfig, content);

      fixModuleResolution(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toContain('"Bundler"');
    });
  });
});

describe("fixModuleResolution - CONF-02 idempotent: already Bundler produces no file write", () => {
  it("does not modify the file when moduleResolution is already Bundler", () => {
    withTempDir((dir) => {
      const tsconfig = join(dir, "tsconfig.json");
      const content = JSON.stringify({ compilerOptions: { moduleResolution: "Bundler" } }, null, 2);
      writeFileSync(tsconfig, content);

      fixModuleResolution(dir);

      const result = readFileSync(tsconfig, "utf-8");
      expect(result).toBe(content);
    });
  });
});

describe("fixModuleResolution - CONF-02 missing file: silently returns when tsconfig.json absent", () => {
  it("does not throw when tsconfig.json does not exist", () => {
    withTempDir((dir) => {
      expect(() => fixModuleResolution(dir)).not.toThrow();
    });
  });
});

// -----------------------------------------------------------------------
// CONF-03: fixPackageType
// -----------------------------------------------------------------------

describe('fixPackageType - CONF-03: adds type: "module" to package.json when absent', () => {
  it('adds "type": "module" when package.json has no type field', () => {
    withTempDir((dir) => {
      const pkgPath = join(dir, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "my-app", version: "1.0.0" }, null, 2));

      fixPackageType(dir);

      const result = JSON.parse(readFileSync(pkgPath, "utf-8"));
      expect(result.type).toBe("module");
    });
  });

  it("output ends with a trailing newline", () => {
    withTempDir((dir) => {
      const pkgPath = join(dir, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "my-app" }, null, 2));

      fixPackageType(dir);

      const raw = readFileSync(pkgPath, "utf-8");
      expect(raw.endsWith("\n")).toBe(true);
    });
  });
});

describe('fixPackageType - CONF-03 idempotent: already has type "module" produces no file write', () => {
  it("does not modify the file when type is already module", () => {
    withTempDir((dir) => {
      const pkgPath = join(dir, "package.json");
      const content =
        JSON.stringify({ name: "my-app", version: "1.0.0", type: "module" }, null, 2) + "\n";
      writeFileSync(pkgPath, content);

      fixPackageType(dir);

      const result = readFileSync(pkgPath, "utf-8");
      expect(result).toBe(content);
    });
  });
});

describe("fixPackageType - CONF-03 missing file: silently returns when package.json absent", () => {
  it("does not throw when package.json does not exist", () => {
    withTempDir((dir) => {
      expect(() => fixPackageType(dir)).not.toThrow();
    });
  });
});
