import { existsSync } from "node:fs";
import { join } from "node:path";
import spawn from "cross-spawn";

/**
 * Initialize a git repository in outDir with an initial commit.
 *
 * Shared helper used by both non-interactive (Plan 01) and interactive (Plan 02) paths.
 *
 * Steps:
 * 1. If .git already exists, return true immediately (already initialized).
 * 2. Run `git init`
 * 3. Run `git add -A`
 * 4. Run `git commit -m "Initial commit"`
 *
 * Git failure is NON-FATAL: returns false if any step fails.
 */
export function initGitRepo(outDir: string): boolean {
  if (existsSync(join(outDir, ".git"))) {
    return true;
  }

  const initResult = spawn.sync("git", ["init"], { cwd: outDir, stdio: "pipe" });
  if (initResult.status !== 0) {
    return false;
  }

  const addResult = spawn.sync("git", ["add", "-A"], { cwd: outDir, stdio: "pipe" });
  if (addResult.status !== 0) {
    return false;
  }

  const commitResult = spawn.sync("git", ["commit", "-m", "Initial commit"], {
    cwd: outDir,
    stdio: "pipe",
  });
  if (commitResult.status !== 0) {
    return false;
  }

  return true;
}
