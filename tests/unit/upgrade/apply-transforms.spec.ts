import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { applyTransforms } from "../../../migrations/v2/apply-transforms.ts";
import type { SourceReplacement, TransformFn } from "../../../migrations/v2/types.ts";

describe("applyTransforms", () => {
  let tmpDir: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "apply-transforms-test-"));
    tmpFile = join(tmpDir, "test-file.ts");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("Test 1: two non-overlapping stub transforms produce combined output without throwing", () => {
    // Source: 'import { foo } from "a"; import { bar } from "b";'
    const source = 'import { foo } from "a"; import { bar } from "b";';
    writeFileSync(tmpFile, source, "utf-8");

    // Transform 1: replaces "foo" (indices 9-12)
    const transform1: TransformFn = (_filePath, src, _parseResult) => {
      const start = src.indexOf("foo");
      const end = start + 3;
      return [{ start, end, replacement: "FOO" }];
    };

    // Transform 2: replaces "bar" (indices 34-37 approx)
    const transform2: TransformFn = (_filePath, src, _parseResult) => {
      const start = src.indexOf("bar");
      const end = start + 3;
      return [{ start, end, replacement: "BAR" }];
    };

    expect(() => applyTransforms(tmpFile, [transform1, transform2])).not.toThrow();

    const result = readFileSync(tmpFile, "utf-8");
    expect(result).toContain("FOO");
    expect(result).toContain("BAR");
    expect(result).not.toContain('"foo"');
    expect(result).not.toContain('"bar"');
  });

  it("Test 2: applyTransforms with empty transforms array does not throw and does not modify file", () => {
    const source = "const x = 1;\n";
    writeFileSync(tmpFile, source, "utf-8");

    const before = readFileSync(tmpFile, "utf-8");
    expect(() => applyTransforms(tmpFile, [])).not.toThrow();
    const after = readFileSync(tmpFile, "utf-8");

    expect(after).toBe(before);
  });

  it("Test 3: a transform returning empty SourceReplacement[] does not modify the file", () => {
    const source = "const y = 2;\n";
    writeFileSync(tmpFile, source, "utf-8");

    const noOpTransform: TransformFn = () => [];

    const before = readFileSync(tmpFile, "utf-8");
    expect(() => applyTransforms(tmpFile, [noOpTransform])).not.toThrow();
    const after = readFileSync(tmpFile, "utf-8");

    expect(after).toBe(before);
  });

  it("Test 4: applyTransforms correctly sorts replacements descending by start before applying", () => {
    // Use a source where applying in wrong order would corrupt offsets
    // "aaa bbb ccc" — replace "aaa" at 0-3 and "ccc" at 8-11
    const source = "aaa bbb ccc";
    writeFileSync(tmpFile, source, "utf-8");

    // Transform 1 gives later offset first (ccc)
    const transform1: TransformFn = (_filePath, src, _parseResult): SourceReplacement[] => {
      const start = src.indexOf("ccc");
      return [{ start, end: start + 3, replacement: "CCC" }];
    };

    // Transform 2 gives earlier offset (aaa)
    const transform2: TransformFn = (_filePath, src, _parseResult): SourceReplacement[] => {
      const start = src.indexOf("aaa");
      return [{ start, end: start + 3, replacement: "AAA" }];
    };

    expect(() => applyTransforms(tmpFile, [transform1, transform2])).not.toThrow();

    const result = readFileSync(tmpFile, "utf-8");
    expect(result).toBe("AAA bbb CCC");
  });

  it("Test 5: overlapping replacements from two transforms cause a descriptive error (magic-string collision)", () => {
    // "hello world" — both transforms try to replace the same range
    const source = "hello world";
    writeFileSync(tmpFile, source, "utf-8");

    const overlap1: TransformFn = (_filePath, src, _parseResult): SourceReplacement[] => {
      return [{ start: 0, end: 5, replacement: "HELLO" }];
    };

    const overlap2: TransformFn = (_filePath, src, _parseResult): SourceReplacement[] => {
      return [{ start: 0, end: 5, replacement: "GREET" }];
    };

    expect(() => applyTransforms(tmpFile, [overlap1, overlap2])).toThrow();
  });
});
