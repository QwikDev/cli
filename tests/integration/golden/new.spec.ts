import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "@japa/runner";
import { runCli } from "../helpers/cli.ts";
import { getFixturePath } from "../helpers/fixtures.ts";

const FX_04 = getFixturePath("empty-project");
const FX_05 = getFixturePath("existing-files");

test.group("NEW-01 -- qwik new /dashboard", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-new01-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_04, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates dashboard route file, exit 0", ({ assert }) => {
    const result = runCli(["new", "/dashboard"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.isTrue(
      existsSync(join(tmpDir, "src/routes/dashboard/index.tsx")),
      "src/routes/dashboard/index.tsx should exist",
    );
  });
});

test.group("NEW-02 -- qwik new counter", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-new02-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_04, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates counter component file, exit 0", ({ assert }) => {
    const result = runCli(["new", "counter"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.isTrue(
      existsSync(join(tmpDir, "src/components/counter.tsx")),
      "src/components/counter.tsx should exist",
    );
  });
});

test.group("NEW-03 -- qwik new /blog/post.md", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-new03-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_04, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates blog/post.md route file, exit 0", ({ assert }) => {
    const result = runCli(["new", "/blog/post.md"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.isTrue(
      existsSync(join(tmpDir, "src/routes/blog/post.md")),
      "src/routes/blog/post.md should exist",
    );
  });
});

test.group("NEW-04 -- duplicate guard", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-new04-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_05, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("exits 1 and reports already exists when route already present", ({ assert }) => {
    const result = runCli(["new", "/dashboard"], tmpDir);
    assert.strictEqual(result.status, 1);
    const output = result.stdout + result.stderr;
    assert.include(output, "already exists");
  });
});

test.group("NEW-05 -- nested directory creation", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-new05-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_04, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("creates deeply nested route and intermediate directories, exit 0", ({ assert }) => {
    const result = runCli(["new", "/nested/deep/route"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.isTrue(
      existsSync(join(tmpDir, "src/routes/nested/deep/route/index.tsx")),
      "src/routes/nested/deep/route/index.tsx should exist",
    );
  });
});
