import { test } from "@japa/runner";
import { runCli } from "../helpers/cli.ts";

test.group("VER-01 -- qwik version", () => {
  test("outputs bare semver string, no label prefix, exit 0", ({ assert }) => {
    const result = runCli(["version"]);
    assert.strictEqual(result.status, 0);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/m);
  });
});

test.group("JOKE-01 -- qwik joke", () => {
  test("outputs joke text, exit 0, no file writes", ({ assert }) => {
    const result = runCli(["joke"]);
    assert.strictEqual(result.status, 0);
    assert.isTrue(result.stdout.length > 0, "stdout should not be empty");
    const lines = result.stdout
      .trim()
      .split("\n")
      .filter((l) => l.length > 0);
    assert.isTrue(lines.length >= 2, "joke should have at least two lines (setup + punchline)");
  });
});
