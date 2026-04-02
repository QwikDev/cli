import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Detect the installed Qwik version from the target project's package.json.
 *
 * Checks dependencies then devDependencies for:
 * - `@qwik.dev/core` (v2 project)
 * - `@builder.io/qwik` (v1 project, fallback)
 *
 * @param rootDir - Absolute path to the project root
 * @returns The version string (may be a range like `^2.1.0`) or null if not found
 */
export function detectInstalledVersion(rootDir: string): string | null {
  try {
    const pkgPath = join(rootDir, "package.json");
    const raw = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    const deps = pkg["dependencies"] as Record<string, string> | undefined;
    const devDeps = pkg["devDependencies"] as Record<string, string> | undefined;

    // Check @qwik.dev/core first (v2 project)
    const v2InDeps = deps?.["@qwik.dev/core"];
    if (v2InDeps !== undefined) return v2InDeps;

    const v2InDevDeps = devDeps?.["@qwik.dev/core"];
    if (v2InDevDeps !== undefined) return v2InDevDeps;

    // Fall back to @builder.io/qwik (v1 project)
    const v1InDeps = deps?.["@builder.io/qwik"];
    if (v1InDeps !== undefined) return v1InDeps;

    const v1InDevDeps = devDeps?.["@builder.io/qwik"];
    if (v1InDevDeps !== undefined) return v1InDevDeps;

    return null;
  } catch {
    return null;
  }
}
