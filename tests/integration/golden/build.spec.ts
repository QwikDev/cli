import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "@japa/runner";
import { runCli } from "../helpers/cli.ts";
import { getFixturePath } from "../helpers/fixtures.ts";

const FX_01 = getFixturePath("fx-01");

test.group("BUILD-01 -- qwik build", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-build01-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("runs build.client first, then parallel scripts, exit 0", ({ assert }) => {
    const result = runCli(["build"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.include(result.stdout, "build-client-ok");
  });
});

test.group("BUILD-02 -- qwik build preview", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-build02-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("triggers build.preview instead of build.server, exit 0", ({ assert }) => {
    const result = runCli(["build", "preview"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.include(result.stdout, "build-preview-ok");
  });
});

test.group("BUILD-03 -- qwik build --mode staging", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-build03-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("forwards --mode to build scripts, exit 0", ({ assert }) => {
    const result = runCli(["build", "--mode", "staging"], tmpDir);
    assert.strictEqual(result.status, 0);
  });
});

test.group("BUILD-04 -- qwik build with failing script", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-build04-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    cpSync(FX_01, tmpDir, { recursive: true });

    // Overwrite package.json to make build.server fail
    const pkg = {
      name: "fx-01-failing-build",
      version: "0.0.1",
      dependencies: {
        "@qwik.dev/core": "^2.0.0",
        "@qwik.dev/router": "^2.0.0",
      },
      scripts: {
        "build.client": "echo build-client-ok",
        "build.server": "exit 1",
        "build.preview": "echo build-preview-ok",
        "build.types": "echo build-types-ok",
        lint: "echo lint-ok",
      },
    };
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify(pkg, null, 2));
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("sets exitCode 1 but does not abort parallel scripts", ({ assert }) => {
    const result = runCli(["build"], tmpDir);
    assert.strictEqual(result.status, 1);
  });
});
