import { copyFileSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { $ } from "panam/executor";
import { getPackageManagerName } from "../utils/package-manager.ts";

/**
 * Result object for a background dependency install.
 *
 * - `success`: undefined while running, true on success, false on failure/abort
 * - `abort()`: cancels the install and cleans up the tmp directory
 * - `complete(outDir)`: waits for install to finish, then moves node_modules and
 *   lock files into outDir. Returns true on success.
 */
export interface BackgroundInstall {
  readonly success: boolean | undefined;
  abort(): Promise<void>;
  complete(outDir: string): Promise<boolean>;
}

/** Lock file names to attempt moving after a successful install. */
const LOCK_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"];

/**
 * Start a background dependency install in a temporary directory.
 *
 * Immediately copies `package.json` from `baseAppDir` into a fresh tmp dir
 * (sibling of `outDir`), then kicks off `pm install` in the background.
 *
 * The caller holds the returned `BackgroundInstall` handle and either:
 *  - calls `complete(outDir)` to wait and move results in, or
 *  - calls `abort()` to cancel and clean up.
 */
export function backgroundInstallDeps(baseAppDir: string, outDir: string): BackgroundInstall {
  // Unique tmp dir name — sibling of outDir
  const tmpId =
    ".create-qwik-" + Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(36).toLowerCase();
  const tmpInstallDir = resolve(outDir, "..", tmpId);

  // Create tmp dir and copy package.json into it
  mkdirSync(tmpInstallDir, { recursive: true });
  copyFileSync(join(baseAppDir, "package.json"), join(tmpInstallDir, "package.json"));

  const pm = getPackageManagerName();

  // Start background install
  const proc = $(pm, ["install"], { cwd: tmpInstallDir });

  // Track success state
  let success: boolean | undefined = undefined;
  proc.result.then((r: { status: boolean }) => {
    success = r.status;
  });

  return {
    get success() {
      return success;
    },

    async abort(): Promise<void> {
      await proc.abort();
      rmSync(tmpInstallDir, { recursive: true, force: true });
    },

    async complete(destDir: string): Promise<boolean> {
      const result = await proc.result;
      if (!result.status) {
        rmSync(tmpInstallDir, { recursive: true, force: true });
        return false;
      }

      // Move node_modules from tmp to destination
      try {
        renameSync(join(tmpInstallDir, "node_modules"), join(destDir, "node_modules"));
      } catch {
        rmSync(tmpInstallDir, { recursive: true, force: true });
        return false;
      }

      // Move lock files (each may or may not exist — ignore failures)
      for (const lockFile of LOCK_FILES) {
        try {
          renameSync(join(tmpInstallDir, lockFile), join(destDir, lockFile));
        } catch {
          // File doesn't exist for this pm — that's expected
        }
      }

      // Clean up tmp dir
      rmSync(tmpInstallDir, { recursive: true, force: true });
      return true;
    },
  };
}
