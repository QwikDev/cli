import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pm from "panam/pm";
import type { IntegrationData } from "../types.ts";

/**
 * Merge scripts, dependencies, and devDependencies from an integration's
 * package.json into the target project's package.json.
 * Integration values overwrite target values on conflict.
 */
export function mergeIntegrationPackageJson(integration: IntegrationData, rootDir: string): void {
  const targetPath = join(rootDir, "package.json");
  const target = JSON.parse(readFileSync(targetPath, "utf-8")) as Record<string, unknown>;
  const source = integration.pkgJson;

  // Merge scripts
  if (source.scripts && typeof source.scripts === "object") {
    target.scripts = Object.assign(
      {},
      target.scripts as Record<string, unknown>,
      source.scripts as Record<string, unknown>,
    );
  }

  // Merge dependencies (sorted)
  if (source.dependencies && typeof source.dependencies === "object") {
    const merged = Object.assign(
      {},
      target.dependencies as Record<string, unknown>,
      source.dependencies as Record<string, unknown>,
    );
    target.dependencies = Object.fromEntries(
      Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  // Merge devDependencies (sorted)
  if (source.devDependencies && typeof source.devDependencies === "object") {
    const merged = Object.assign(
      {},
      target.devDependencies as Record<string, unknown>,
      source.devDependencies as Record<string, unknown>,
    );
    target.devDependencies = Object.fromEntries(
      Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  writeFileSync(targetPath, JSON.stringify(target, null, 2) + "\n");
}

/**
 * Copy all integration files into the project rootDir.
 * Creates parent directories as needed.
 */
export async function commitIntegration(
  integration: IntegrationData,
  rootDir: string,
): Promise<void> {
  for (const filePath of integration.filePaths) {
    const srcPath = join(integration.dir, filePath);
    const destPath = join(rootDir, filePath);

    // Ensure parent directory exists
    mkdirSync(dirname(destPath), { recursive: true });

    const content = readFileSync(srcPath);
    writeFileSync(destPath, content);
  }
}

/**
 * Check if integration has any dependencies or devDependencies.
 */
export function integrationHasDeps(integration: IntegrationData): boolean {
  const deps = integration.pkgJson.dependencies as Record<string, unknown> | undefined;
  const devDeps = integration.pkgJson.devDependencies as Record<string, unknown> | undefined;

  const hasDeps = deps !== undefined && Object.keys(deps).length > 0;
  const hasDevDeps = devDeps !== undefined && Object.keys(devDeps).length > 0;

  return hasDeps || hasDevDeps;
}

/**
 * Install dependencies in the given working directory using panam.
 */
export async function installDeps(cwd: string): Promise<void> {
  await pm.install({ cwd });
}

/**
 * Run a postInstall command in the given working directory.
 * Uses npx for npm, or the package manager name directly for pnpm/yarn/bun.
 */
export async function runPostInstall(postInstallCmd: string, cwd: string): Promise<void> {
  const [command] = postInstallCmd.split(" ");
  if (!command) return;

  const result = await pm.x(postInstallCmd, { cwd });
  if (!result.status) {
    throw new Error(`Post-install command failed: ${postInstallCmd}`);
  }
}
