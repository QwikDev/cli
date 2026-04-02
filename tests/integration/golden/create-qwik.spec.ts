import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "@japa/runner";
import { runCreateQwik } from "../helpers/cli.js";

test.group("CRE-01 -- create-qwik empty", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cre-01-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    // Create parent tmpDir so we can reliably clean up in teardown.
    // outDir (my-app) is a child of tmpDir; create-qwik should create it.
    mkdirSync(tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("scaffolds empty starter with package.json containing @qwik.dev/core", ({ assert }) => {
    const outDir = join(tmpDir, "my-app");
    const result = runCreateQwik(["empty", outDir]);
    // Will FAIL: bin/create-qwik.ts does not exist until Phase 6.
    // The spawnSync call returns non-zero status when module cannot be found.
    assert.strictEqual(result.status, 0);
    assert.isTrue(existsSync(join(outDir, "package.json")), "scaffolded project must have package.json");
    const pkgRaw = readFileSync(join(outDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    assert.property(deps, "@qwik.dev/core", "package.json dependencies must include @qwik.dev/core");
    assert.isTrue(existsSync(join(outDir, "src", "routes")), "scaffolded project must have src/routes directory");
  });
});

test.group("CRE-02 -- create-qwik library", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cre-02-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("scaffolds library starter with valid package.json", ({ assert }) => {
    const outDir = join(tmpDir, "my-lib");
    const result = runCreateQwik(["library", outDir]);
    // Will FAIL: bin/create-qwik.ts does not exist until Phase 6.
    assert.strictEqual(result.status, 0);
    assert.isTrue(existsSync(join(outDir, "package.json")), "scaffolded library must have package.json");
    const pkgRaw = readFileSync(join(outDir, "package.json"), "utf-8");
    // Assert package.json is valid JSON (no merge artifacts)
    const pkg = JSON.parse(pkgRaw) as Record<string, unknown>;
    // Assert no base layer merge artifact key 'starterApp' (would indicate template merge bug)
    assert.notProperty(pkg, "starterApp", "package.json must not contain merge artifact key 'starterApp'");
  });
});
