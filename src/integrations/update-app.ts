import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import spawn from "cross-spawn";
import { install } from "panam";
import type { IntegrationData } from "../types.js";
import { getPackageManagerName } from "../utils/package-manager.js";

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
  await install({ cwd });
}

/**
 * Run a postInstall command in the given working directory.
 * Uses npx for npm, or the package manager name directly for pnpm/yarn/bun.
 */
export async function runPostInstall(postInstallCmd: string, cwd: string): Promise<void> {
  const parts = postInstallCmd.split(" ");
  const [command, ...args] = parts;
  if (!command) return;

  const pm = getPackageManagerName();
  const executor = pm === "npm" ? "npx" : pm;

  spawn.sync(executor, [command, ...args], { cwd, stdio: "inherit" });
}
