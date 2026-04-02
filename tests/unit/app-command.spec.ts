import { test } from "@japa/runner";
import { AppCommand } from "../../src/app-command.js";

test.group("AppCommand - getArg", () => {
  test("getArg supports --flag=value form", ({ assert }) => {
    const cmd = new AppCommand({
      rootDir: "/",
      cwd: "/project",
      args: ["build", "--mode=staging"],
    });
    assert.strictEqual(cmd.getArg("mode"), "staging");
  });

  test("getArg supports --flag value form", ({ assert }) => {
    const cmd = new AppCommand({
      rootDir: "/",
      cwd: "/project",
      args: ["build", "--mode", "staging"],
    });
    assert.strictEqual(cmd.getArg("mode"), "staging");
  });

  test("getArg returns undefined for unknown flags", ({ assert }) => {
    const cmd = new AppCommand({
      rootDir: "/",
      cwd: "/project",
      args: ["build", "--mode=staging"],
    });
    assert.isUndefined(cmd.getArg("unknown"));
  });
});

test.group("AppCommand - task", () => {
  test("task returns first arg (subcommand name)", ({ assert }) => {
    const cmd = new AppCommand({
      rootDir: "/",
      cwd: "/project",
      args: ["build", "--mode=staging"],
    });
    assert.strictEqual(cmd.task, "build");
  });

  test("task is undefined when args is empty", ({ assert }) => {
    const cmd = new AppCommand({
      rootDir: "/",
      cwd: "/project",
      args: [],
    });
    assert.isUndefined(cmd.task);
  });
});

test.group("AppCommand - args", () => {
  test("args is a copy of provided args", ({ assert }) => {
    const original = ["build", "--mode=staging"];
    const cmd = new AppCommand({
      rootDir: "/",
      cwd: "/project",
      args: original,
    });
    assert.deepEqual(cmd.args, original);
    // Ensure it's a copy, not the same reference
    original.push("--extra");
    assert.strictEqual(cmd.args.length, 2);
  });
});
