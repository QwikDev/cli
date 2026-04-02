import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectInstalledVersion } from "../../../src/upgrade/detect-version.ts";

describe("detectInstalledVersion", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "qwik-detect-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns @qwik.dev/core version when present in dependencies", () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { "@qwik.dev/core": "^2.1.0" } }),
      "utf-8",
    );
    expect(detectInstalledVersion(tmpDir)).toBe("^2.1.0");
  });

  it("returns @builder.io/qwik version for v1 project", () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({ dependencies: { "@builder.io/qwik": "^1.9.0" } }),
      "utf-8",
    );
    expect(detectInstalledVersion(tmpDir)).toBe("^1.9.0");
  });

  it("prefers @qwik.dev/core over @builder.io/qwik", () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@qwik.dev/core": "^2.1.0",
          "@builder.io/qwik": "^1.9.0",
        },
      }),
      "utf-8",
    );
    expect(detectInstalledVersion(tmpDir)).toBe("^2.1.0");
  });

  it("checks devDependencies too", () => {
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        dependencies: {},
        devDependencies: { "@qwik.dev/core": "^2.0.0" },
      }),
      "utf-8",
    );
    expect(detectInstalledVersion(tmpDir)).toBe("^2.0.0");
  });

  it("returns null when no Qwik package found", () => {
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ dependencies: {} }), "utf-8");
    expect(detectInstalledVersion(tmpDir)).toBeNull();
  });

  it("returns null when package.json is missing", () => {
    // tmpDir exists but has no package.json
    expect(detectInstalledVersion(tmpDir)).toBeNull();
  });
});
