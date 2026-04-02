import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "@japa/runner";
import { runCli } from "../helpers/cli.js";
import { getFixturePath } from "../helpers/fixtures.js";

const FX_02 = getFixturePath("fx-02");
const FX_03 = getFixturePath("fx-03");

/**
 * Recursively collect all files under a directory.
 */
function collectFiles(dir: string): string[] {
  const result: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }
  return result;
}

test.group("MIG-01 -- full migration golden path", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-mig-01-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    // IMPORTANT: always copy fixture — migration is DESTRUCTIVE (rewrites source files)
    cpSync(FX_02, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("migrates @builder.io imports to @qwik.dev and removes ts-morph", ({ assert }) => {
    const result = runCli(["migrate-v2"], tmpDir, { input: "y\n" });
    assert.strictEqual(result.status, 0);

    const appTsx = readFileSync(join(tmpDir, "src", "app.tsx"), "utf-8");
    // Negative assertions: old import names must be gone
    assert.isFalse(appTsx.includes("@builder.io/qwik"), "src/app.tsx must not contain @builder.io/qwik after migration");

    const indexTsx = readFileSync(join(tmpDir, "src", "routes", "index.tsx"), "utf-8");
    assert.isFalse(indexTsx.includes("@builder.io/qwik-city"), "src/routes/index.tsx must not contain @builder.io/qwik-city after migration");

    const pkg = JSON.parse(readFileSync(join(tmpDir, "package.json"), "utf-8")) as Record<string, unknown>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
    assert.notProperty(deps, "ts-morph", "dependencies must not contain ts-morph after migration");
    assert.notProperty(devDeps, "ts-morph", "devDependencies must not contain ts-morph after migration");

    // POSITIVE assertion — ensures red against stub.
    // Stub does not rewrite files, so src/app.tsx still contains @builder.io/qwik, not @qwik.dev/core.
    // This assertion WILL FAIL against the stub and WILL PASS in Phase 5 when migration is real.
    assert.isTrue(appTsx.includes("@qwik.dev/core"), "src/app.tsx MUST contain @qwik.dev/core after migration (positive assertion, fails against stub)");
  });
});

test.group("MIG-02 -- user cancels migration", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-mig-02-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_02, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("exits 0 on user cancel without modifying files", ({ assert }) => {
    // Pipe Ctrl+C (\x03) to stdin — @clack/prompts treats this as a cancel signal,
    // triggering isCancel() → true → bye() → exit 0 without modifying files.
    const result = runCli(["migrate-v2"], tmpDir, { input: "\x03" });
    // Cancellation is NOT an error — exit 0 is MUST PRESERVE per COMPATIBILITY-CONTRACT.
    assert.strictEqual(result.status, 0);

    const appTsx = readFileSync(join(tmpDir, "src", "app.tsx"), "utf-8");
    // Files must be unchanged when user cancels
    assert.isTrue(appTsx.includes("@builder.io/qwik"), "src/app.tsx must still contain @builder.io/qwik after cancel (no files modified)");
  });
});

test.group("MIG-03 -- ts-morph idempotency guard", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-mig-03-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_03, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("preserves ts-morph in devDependencies when project already uses it", ({ assert }) => {
    const result = runCli(["migrate-v2"], tmpDir, { input: "y\n" });
    assert.strictEqual(result.status, 0);

    const pkg = JSON.parse(readFileSync(join(tmpDir, "package.json"), "utf-8")) as Record<string, unknown>;
    const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;
    assert.property(devDeps, "ts-morph", "devDependencies must still contain ts-morph when project already uses it (idempotency guard)");
  });
});

test.group("MIG-04 -- substring ordering constraint", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-mig-04-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_02, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("does not produce @qwik.dev/core-city from wrong replacement order", ({ assert }) => {
    const result = runCli(["migrate-v2"], tmpDir, { input: "y\n" });
    assert.strictEqual(result.status, 0);

    // Assert NO file under src/ contains @qwik.dev/core-city.
    // This string would appear if @builder.io/qwik replacement runs BEFORE @builder.io/qwik-city
    // (the substring ordering bug). Correct order: replace @builder.io/qwik-city first, then @builder.io/qwik.
    const srcFiles = collectFiles(join(tmpDir, "src"));
    for (const filePath of srcFiles) {
      const content = readFileSync(filePath, "utf-8");
      assert.isFalse(content.includes("@qwik.dev/core-city"), `${filePath} must not contain @qwik.dev/core-city (substring ordering bug)`);
    }

    // POSITIVE assertion — ensures red against stub.
    // Stub does not rewrite files, so src/routes/index.tsx still has @builder.io/qwik-city, not @qwik.dev/router.
    // This assertion WILL FAIL against the stub and WILL PASS in Phase 5 when migration is real.
    const indexTsx = readFileSync(join(tmpDir, "src", "routes", "index.tsx"), "utf-8");
    assert.isTrue(indexTsx.includes("@qwik.dev/router"), "src/routes/index.tsx MUST contain @qwik.dev/router after migration (positive assertion, fails against stub)");
  });
});

test.group("MIG-05 -- gitignore-respected traversal", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-mig-05-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_02, tmpDir, { recursive: true });
    // Create dist/bundle.js containing @builder.io/qwik text.
    // dist/ is in fx-02's .gitignore; migration must NOT rewrite this file.
    mkdirSync(join(tmpDir, "dist"), { recursive: true });
    writeFileSync(join(tmpDir, "dist", "bundle.js"), "// dist bundle\nimport { component$ } from '@builder.io/qwik';\n");
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("does not rewrite files under dist/ (.gitignore respected)", ({ assert }) => {
    const result = runCli(["migrate-v2"], tmpDir, { input: "y\n" });
    assert.strictEqual(result.status, 0);

    const bundle = readFileSync(join(tmpDir, "dist", "bundle.js"), "utf-8");
    assert.isTrue(bundle.includes("@builder.io/qwik"), "dist/bundle.js must still contain @builder.io/qwik (gitignore-excluded file must not be rewritten)");
  });
});
