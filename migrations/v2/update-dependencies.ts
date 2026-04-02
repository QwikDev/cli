import { install } from "panam";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Read and parse the package.json at rootDir.
 */
function readPackageJson(rootDir: string): Record<string, unknown> {
  const pkgPath = join(rootDir, "package.json");
  const raw = readFileSync(pkgPath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Write an object as formatted package.json to rootDir.
 */
function writePackageJson(rootDir: string, pkg: Record<string, unknown>): void {
  const pkgPath = join(rootDir, "package.json");
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}

/**
 * Check if ts-morph is already in the project's package.json dependencies.
 *
 * This is the idempotency guard (UPGR-08): if ts-morph was pre-existing before
 * the migration, we must NOT remove it at the end.
 *
 * @param rootDir - Absolute path to the project root (contains package.json)
 * @returns true if ts-morph is listed in dependencies or devDependencies
 */
export function checkTsMorphPreExisting(rootDir: string): boolean {
  let pkg: Record<string, unknown>;
  try {
    pkg = readPackageJson(rootDir);
  } catch {
    return false;
  }

  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;

  return !!(deps?.["ts-morph"] || devDeps?.["ts-morph"]);
}

/**
 * Remove ts-morph from dependencies and devDependencies in package.json.
 *
 * Used as a cleanup step after migration when ts-morph was NOT pre-existing.
 *
 * @param rootDir - Absolute path to the project root
 */
export function removeTsMorphFromPackageJson(rootDir: string): void {
  let pkg: Record<string, unknown>;
  try {
    pkg = readPackageJson(rootDir);
  } catch {
    return;
  }

  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;

  if (deps) {
    delete deps["ts-morph"];
  }
  if (devDeps) {
    delete devDeps["ts-morph"];
  }

  writePackageJson(rootDir, pkg);
}

/**
 * Update package.json with the resolved v2 versions and run install.
 *
 * For each package in `versions`:
 * - If already in `dependencies`, update the version
 * - If already in `devDependencies`, update the version
 * - If not present in either, add to `dependencies`
 *
 * Then runs `pnpm/npm/yarn install` via panam in the given rootDir.
 *
 * @param rootDir - Absolute path to the project root
 * @param versions - Map of package name → semver version string
 */
export async function updateDependencies(
  rootDir: string,
  versions: Record<string, string>,
): Promise<void> {
  let pkg: Record<string, unknown>;
  try {
    pkg = readPackageJson(rootDir);
  } catch {
    return;
  }

  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;

  // Ensure the objects are assigned back (in case they were newly created above)
  pkg.dependencies = deps;

  for (const [packageName, version] of Object.entries(versions)) {
    if (Object.prototype.hasOwnProperty.call(deps, packageName)) {
      deps[packageName] = version;
    } else if (Object.prototype.hasOwnProperty.call(devDeps, packageName)) {
      devDeps[packageName] = version;
    } else {
      // Not present — add to dependencies
      deps[packageName] = version;
    }
  }

  writePackageJson(rootDir, pkg);

  // Run install to apply the updated dependencies
  await install({ cwd: rootDir });
}
