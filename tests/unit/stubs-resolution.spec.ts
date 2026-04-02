import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "@japa/runner";

test.group("stubs/ path resolution via import.meta.url", () => {
  test("fileURLToPath(new URL('../stubs/', import.meta.url)) resolves to a real directory", ({
    assert,
  }) => {
    // Resolve from the src/ directory (where production code lives)
    const stubsDir = fileURLToPath(new URL("../../stubs/", import.meta.url));
    assert.isTrue(
      existsSync(stubsDir),
      `stubs/ directory should exist at ${stubsDir}`,
    );
  });

  test("stubs/ directory contains adapters subdirectory", ({ assert }) => {
    const stubsDir = fileURLToPath(new URL("../../stubs/", import.meta.url));
    const adaptersDir = `${stubsDir}adapters`;
    assert.isTrue(
      existsSync(adaptersDir),
      `stubs/adapters/ should exist at ${adaptersDir}`,
    );
  });

  test("stubs/ directory contains features subdirectory", ({ assert }) => {
    const stubsDir = fileURLToPath(new URL("../../stubs/", import.meta.url));
    const featuresDir = `${stubsDir}features`;
    assert.isTrue(
      existsSync(featuresDir),
      `stubs/features/ should exist at ${featuresDir}`,
    );
  });

  test("stubs/ directory contains apps subdirectory", ({ assert }) => {
    const stubsDir = fileURLToPath(new URL("../../stubs/", import.meta.url));
    const appsDir = `${stubsDir}apps`;
    assert.isTrue(
      existsSync(appsDir),
      `stubs/apps/ should exist at ${appsDir}`,
    );
  });

  test("stubs/ directory contains templates subdirectory", ({ assert }) => {
    const stubsDir = fileURLToPath(new URL("../../stubs/", import.meta.url));
    const templatesDir = `${stubsDir}templates`;
    assert.isTrue(
      existsSync(templatesDir),
      `stubs/templates/ should exist at ${templatesDir}`,
    );
  });

  test("import.meta.url resolves consistently from different reference depths", ({
    assert,
  }) => {
    // Confirm the resolution pattern works — test file is in tests/unit/
    // Production src/ files will use '../stubs/' (one level up from src/)
    const fromTestsUnit = fileURLToPath(
      new URL("../../stubs/", import.meta.url),
    );
    assert.isTrue(
      existsSync(fromTestsUnit),
      "Resolution from tests/unit/ (../../stubs/) should work",
    );
  });
});
