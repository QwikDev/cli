import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "@japa/runner";

const ROOT = join(import.meta.dirname, "..", "..");

test.group("Scaffold", () => {
  test("package.json files includes stubs", ({ assert }) => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    assert.include(pkg.files, "stubs");
  });

  test("stubs/ subdirectories exist", ({ assert }) => {
    for (const dir of ["adapters", "features", "apps", "templates"]) {
      assert.isTrue(existsSync(join(ROOT, "stubs", dir)), `stubs/${dir} should exist`);
    }
  });

  test("package.json exports field has import and require conditions", ({ assert }) => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
    assert.property(pkg.exports["."], "import");
    assert.property(pkg.exports["."], "require");
  });
});
