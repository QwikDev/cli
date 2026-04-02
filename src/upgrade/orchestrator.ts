import semver from "semver";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runV2Migration } from "../../migrations/v2/index.js";
import { updateDependencies } from "../../migrations/v2/update-dependencies.js";
import { getLatestV2Version, resolveV2Versions } from "../../migrations/v2/versions.js";
import { buildMigrationChain, type MigrationStep } from "./chain-builder.js";
import { detectInstalledVersion } from "./detect-version.js";

/**
 * The ordered registry of all available migration steps.
 * New versions are appended here as they are released.
 */
export const MIGRATION_REGISTRY: MigrationStep[] = [
  { version: "2.0.0", label: "v2", run: runV2Migration },
];

/**
 * Fetch the latest v2 Qwik version from the npm registry.
 *
 * @returns A semver string like "2.1.0" or null if the registry is unreachable
 */
async function getLatestQwikVersion(): Promise<string | null> {
  return getLatestV2Version("@qwik.dev/core");
}

/**
 * Check whether the target project's @qwik.dev/core dependency is already
 * at (or satisfies) the latest published version.
 *
 * @param rootDir - Absolute path to the project root
 * @param latestVersion - The latest semver version string from the registry
 * @returns true if the installed version satisfies latestVersion
 */
function depsAreCurrentVersion(rootDir: string, latestVersion: string): boolean {
  try {
    const pkgPath = join(rootDir, "package.json");
    const raw = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    const deps = pkg["dependencies"] as Record<string, string> | undefined;
    const devDeps = pkg["devDependencies"] as Record<string, string> | undefined;

    const installed = deps?.["@qwik.dev/core"] ?? devDeps?.["@qwik.dev/core"];
    if (!installed) return false;

    return semver.satisfies(latestVersion, installed);
  } catch {
    return false;
  }
}

/**
 * Run the full upgrade process for a Qwik project.
 *
 * 1. Detect installed Qwik version
 * 2. Fetch latest version from npm
 * 3. Build migration chain (steps needed to reach latest)
 * 4. Run each migration step sequentially
 * 5. Unconditionally update dependencies if they are behind latest
 * 6. Print "Already up to date." only if no migrations ran AND deps were current
 *
 * CRITICAL: updateDependencies is NOT gated behind the migration chain.
 * A v2 project with outdated patch-level deps still gets updated.
 *
 * @param rootDir - Absolute path to the target project root
 */
export async function runUpgrade(rootDir: string): Promise<void> {
  // Step 1: Detect installed version
  const installedRaw = detectInstalledVersion(rootDir);

  // Step 2: Fetch latest version from npm
  const latestVersion = await getLatestQwikVersion();

  if (latestVersion === null) {
    console.log(
      "Warning: could not resolve latest version from registry. Using fallback target 2.0.0.",
    );
  }

  const targetVersion = latestVersion ?? "2.0.0";

  // Step 3: Build migration chain
  const chain = buildMigrationChain(installedRaw, targetVersion, MIGRATION_REGISTRY);

  // Step 4: Run each migration step sequentially
  for (const step of chain) {
    console.log(`Running migration: ${step.label}`);
    await step.run(rootDir);
  }

  // Step 5: Unconditionally update deps when they are behind latest
  // (independent of whether migrations ran — patch-level updates still need this)
  const depsAreCurrent = latestVersion !== null && depsAreCurrentVersion(rootDir, latestVersion);

  if (!depsAreCurrent) {
    await updateDependencies(rootDir, resolveV2Versions());
  }

  // Step 6: Print no-op message only when BOTH conditions are satisfied
  if (chain.length === 0 && depsAreCurrent) {
    console.log("Already up to date.");
  }
}
