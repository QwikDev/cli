import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";
import {
  IMPORT_RENAME_ROUNDS,
  replaceImportInFiles,
} from "../../../migrations/v2/rename-import.ts";

// Helper to create a temp directory and files for testing
function withTempDir(callback: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "rename-import-test-"));
  try {
    callback(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("replaceImportInFiles - RNME-01 (QwikCityMockProvider → QwikRouterMockProvider)", () => {
  it("renames QwikCityMockProvider to QwikRouterMockProvider in a file importing from @builder.io/qwik-city", () => {
    withTempDir((dir) => {
      const filePath = join(dir, "test.tsx");
      writeFileSync(
        filePath,
        `import { QwikCityMockProvider } from "@builder.io/qwik-city";\nexport default function App() {}`,
      );

      replaceImportInFiles(
        [["QwikCityMockProvider", "QwikRouterMockProvider"]],
        "@builder.io/qwik-city",
        [filePath],
      );

      const result = readFileSync(filePath, "utf-8");
      expect(result).toContain("QwikRouterMockProvider");
      expect(result).not.toContain("QwikCityMockProvider");
      expect(result).toContain('@builder.io/qwik-city"');
    });
  });
});

describe("replaceImportInFiles - RNME-02 (QwikCityProps → QwikRouterProps)", () => {
  it("renames QwikCityProps to QwikRouterProps in a file importing from @builder.io/qwik-city", () => {
    withTempDir((dir) => {
      const filePath = join(dir, "test.tsx");
      writeFileSync(
        filePath,
        `import { QwikCityProps } from "@builder.io/qwik-city";\nexport type MyProps = QwikCityProps;`,
      );

      replaceImportInFiles([["QwikCityProps", "QwikRouterProps"]], "@builder.io/qwik-city", [
        filePath,
      ]);

      const result = readFileSync(filePath, "utf-8");
      expect(result).toContain("QwikRouterProps");
      expect(result).not.toContain("QwikCityProps");
      expect(result).toContain('@builder.io/qwik-city"');
    });
  });
});

describe("replaceImportInFiles - combined renames", () => {
  it("renames both QwikCityMockProvider and QwikCityProps in the same file", () => {
    withTempDir((dir) => {
      const filePath = join(dir, "test.tsx");
      writeFileSync(
        filePath,
        `import { QwikCityMockProvider, QwikCityProps } from "@builder.io/qwik-city";\nexport default function App() {}`,
      );

      replaceImportInFiles(
        [
          ["QwikCityMockProvider", "QwikRouterMockProvider"],
          ["QwikCityProps", "QwikRouterProps"],
        ],
        "@builder.io/qwik-city",
        [filePath],
      );

      const result = readFileSync(filePath, "utf-8");
      expect(result).toContain("QwikRouterMockProvider");
      expect(result).toContain("QwikRouterProps");
      expect(result).not.toContain("QwikCityMockProvider");
      expect(result).not.toContain("QwikCityProps");
    });
  });
});

describe("replaceImportInFiles - aliased imports", () => {
  it("renames the imported name but preserves alias for aliased imports", () => {
    withTempDir((dir) => {
      const filePath = join(dir, "test.tsx");
      writeFileSync(
        filePath,
        `import { QwikCityMockProvider as Mock } from "@builder.io/qwik-city";\nexport default function App() { return <Mock />; }`,
      );

      replaceImportInFiles(
        [["QwikCityMockProvider", "QwikRouterMockProvider"]],
        "@builder.io/qwik-city",
        [filePath],
      );

      const result = readFileSync(filePath, "utf-8");
      // The imported name (left side of "as") should be renamed
      expect(result).toContain("QwikRouterMockProvider as Mock");
      // The original name should be gone from the import specifier
      expect(result).not.toContain("QwikCityMockProvider as Mock");
      // The alias "Mock" should still be used in JSX
      expect(result).toContain("<Mock />");
    });
  });
});

describe("IMPORT_RENAME_ROUNDS Round 1", () => {
  it("has exactly 5 entries in Round 1 changes (3 existing + RNME-01 + RNME-02)", () => {
    const round1 = IMPORT_RENAME_ROUNDS[0];
    expect(round1).toBeDefined();
    expect(round1!.library).toBe("@builder.io/qwik-city");
    expect(round1!.changes).toHaveLength(5);
  });

  it("Round 1 includes QwikCityMockProvider rename (RNME-01)", () => {
    const round1 = IMPORT_RENAME_ROUNDS[0]!;
    const entry = round1.changes.find(([old]) => old === "QwikCityMockProvider");
    expect(entry).toBeDefined();
    expect(entry![1]).toBe("QwikRouterMockProvider");
  });

  it("Round 1 includes QwikCityProps rename (RNME-02)", () => {
    const round1 = IMPORT_RENAME_ROUNDS[0]!;
    const entry = round1.changes.find(([old]) => old === "QwikCityProps");
    expect(entry).toBeDefined();
    expect(entry![1]).toBe("QwikRouterProps");
  });
});
