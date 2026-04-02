import { cpSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { test } from "@japa/runner";
import { runCli } from "../helpers/cli.ts";
import { getFixturePath, setMtimeFuture, setMtimePast } from "../helpers/fixtures.ts";

const FX_01 = getFixturePath("fx-01");
const FX_06 = getFixturePath("fx-06");

test.group("CHK-01 -- no dist directory", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-chk01-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    // FX-01 has no dist/ directory
    cpSync(FX_01, tmpDir, { recursive: true });
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("triggers build.client when no dist exists, exit 0", ({ assert }) => {
    const result = runCli(["check-client", "src", "dist"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.include(result.stdout, "build-client");
  });
});

test.group("CHK-02 -- up-to-date manifest", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-chk02-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    // FX-06 has dist/q-manifest.json
    cpSync(FX_06, tmpDir, { recursive: true });
    // Make manifest newer than src files — up to date
    setMtimeFuture(join(tmpDir, "dist", "q-manifest.json"));
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("silent success when manifest is newer than src, exit 0", ({ assert }) => {
    const result = runCli(["check-client", "src", "dist"], tmpDir);
    assert.strictEqual(result.status, 0);
    const output = result.stdout.trim();
    assert.isTrue(output.length === 0, `stdout should be empty/whitespace but got: "${output}"`);
  });
});

test.group("CHK-03 -- stale src", (group) => {
  let tmpDir: string;

  group.each.setup(() => {
    tmpDir = join(os.tmpdir(), `qwik-cli-test-chk03-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    // FX-06 has dist/q-manifest.json
    cpSync(FX_06, tmpDir, { recursive: true });
    // Make manifest older than src files — stale, needs rebuild
    setMtimePast(join(tmpDir, "dist", "q-manifest.json"));
  });

  group.each.teardown(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("triggers build.client rebuild when manifest is stale, exit 0", ({ assert }) => {
    const result = runCli(["check-client", "src", "dist"], tmpDir);
    assert.strictEqual(result.status, 0);
    assert.include(result.stdout, "build-client");
  });
});
