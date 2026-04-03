import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "@japa/runner";
import { runCli } from "../helpers/cli.ts";
import { getFixturePath } from "../helpers/fixtures.ts";

const FX_01 = getFixturePath("minimal-qwik-v2-app");

test.group("ADD-01 -- qwik add with --skipConfirmation", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-add-01-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("adds cloudflare-pages integration with --skipConfirmation=true", ({ assert }) => {
    const result = runCli(["add", "cloudflare-pages", "--skipConfirmation=true"], tmpDir);
    assert.strictEqual(result.status, 0);
    // Assert integration-related file was written to tmpDir.
    // Will FAIL until Phase 5 implements add command (stub does not write adapter files).
    const adapterFile = join(tmpDir, "adapters", "cloudflare-pages", "vite.config.ts");
    assert.isTrue(
      existsSync(adapterFile),
      `Expected adapter file at ${adapterFile} to be created by add command`,
    );
  });
});

test.group("ADD-02 -- qwik add with --projectDir", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-add-02-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });
    // Create sub/ subdirectory and copy FX-01 package.json into it
    const subDir = join(tmpDir, "sub");
    mkdirSync(subDir, { recursive: true });
    cpSync(join(FX_01, "package.json"), join(subDir, "package.json"));
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("adds integration to --projectDir subdirectory", ({ assert }) => {
    const result = runCli(
      ["add", "cloudflare-pages", "--projectDir=./sub", "--skipConfirmation=true"],
      tmpDir,
    );
    assert.strictEqual(result.status, 0);
    const adapterFile = join(tmpDir, "sub", "adapters", "cloudflare-pages", "vite.config.ts");
    assert.isTrue(
      existsSync(adapterFile),
      `Expected adapter file at ${adapterFile} to be created under --projectDir`,
    );
  });
});

test.group("ADD-03 -- qwik add nonexistent integration", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-add-03-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("exits with status 1 for unknown integration", ({ assert }) => {
    const result = runCli(["add", "nonexistent-integration", "--skipConfirmation=true"], tmpDir);
    // Unknown integration should error with exit 1.
    // Will FAIL until Phase 5 implements add command (stub currently exits 0).
    assert.strictEqual(result.status, 1);
  });
});
