import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Program } from "../../core.ts";

type CheckClientArgs = { _: string[] };
type CheckClientInput = { srcDir: string; distDir: string };

/**
 * Recursively find the newest mtime under a directory.
 */
function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full));
    } else {
      newest = Math.max(newest, statSync(full).mtimeMs);
    }
  }
  return newest;
}

export class CheckClientProgram extends Program<CheckClientArgs, CheckClientInput> {
  protected configure(): void {
    this.registerCommand("check-client", "Check client build freshness");
  }

  protected validate(definition: CheckClientArgs): CheckClientInput {
    // Positional args: qwik check-client <src> <dist>
    // _[0] = "check-client", _[1] = src, _[2] = dist
    const srcDir = String(definition._[1] ?? "src");
    const distDir = String(definition._[2] ?? "dist");
    return { srcDir, distDir };
  }

  protected async execute(input: CheckClientInput): Promise<number> {
    const cwd = process.cwd();
    const distPath = join(cwd, input.distDir);
    const manifestPath = join(distPath, "q-manifest.json");

    // No dist dir → build
    if (!existsSync(distPath)) {
      return this.runBuildClient(cwd);
    }

    // No manifest → build
    if (!existsSync(manifestPath)) {
      return this.runBuildClient(cwd);
    }

    // Compare manifest mtime vs src files
    const manifestMtime = statSync(manifestPath).mtimeMs;
    const srcPath = join(cwd, input.srcDir);

    if (!existsSync(srcPath)) {
      // No src dir — nothing to compare, treat as up to date
      return 0;
    }

    const srcNewest = newestMtime(srcPath);

    if (srcNewest > manifestMtime) {
      return this.runBuildClient(cwd);
    }

    // Up to date — silent success
    return 0;
  }

  private runBuildClient(cwd: string): number {
    let scripts: Record<string, string> = {};
    try {
      const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8")) as {
        scripts?: Record<string, string>;
      };
      scripts = pkg.scripts ?? {};
    } catch {
      console.error("Error: Could not read package.json");
      return 1;
    }

    const scriptValue = scripts["build.client"];
    if (!scriptValue) {
      console.error("Error: No build.client script in package.json");
      return 1;
    }

    const result = spawnSync(scriptValue, [], {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    return result.status !== 0 ? 1 : 0;
  }
}

export default CheckClientProgram;
