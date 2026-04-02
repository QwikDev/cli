import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { CreateAppResult, IntegrationData } from "../types.js";
import { loadAppStarters } from "../integrations/load-app-starters.js";

/**
 * Ordered list of package.json keys to preserve in output.
 * Fields are written in this exact order.
 */
const ALLOWLIST: readonly string[] = [
  "name",
  "version",
  "description",
  "scripts",
  "dependencies",
  "devDependencies",
  "main",
  "qwik",
  "module",
  "types",
  "exports",
  "files",
  "engines",
];

/**
 * Default engines constraint for scaffolded projects.
 */
const DEFAULT_ENGINES = { node: "^18.17.0 || ^20.3.0 || >=21.0.0" };

/**
 * Clean a raw package.json object:
 * - Remove __qwik__ metadata key
 * - Preserve ALLOWLIST fields in order (skipping undefined values)
 * - Append remaining keys (not in ALLOWLIST, not __qwik__) sorted alphabetically
 * - Add default engines if not already present
 */
export function cleanPackageJson(pkg: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Write allowlist keys in order
  for (const key of ALLOWLIST) {
    if (key in pkg && pkg[key] !== undefined) {
      result[key] = pkg[key];
    }
  }

  // Collect extra keys (not in allowlist, not __qwik__)
  const allowSet = new Set(ALLOWLIST);
  const extraKeys = Object.keys(pkg)
    .filter((k) => !allowSet.has(k) && k !== "__qwik__")
    .sort();

  for (const key of extraKeys) {
    result[key] = pkg[key];
  }

  // Add default engines if not present
  if (!result.engines) {
    result.engines = { ...DEFAULT_ENGINES };
  }

  return result;
}

/**
 * Read package.json from outDir.
 */
function readPkgJson(outDir: string): Record<string, unknown> {
  const content = readFileSync(join(outDir, "package.json"), "utf-8");
  return JSON.parse(content) as Record<string, unknown>;
}

/**
 * Write package.json to outDir.
 */
function writePkgJson(outDir: string, pkg: Record<string, unknown>): void {
  writeFileSync(join(outDir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
}

/**
 * Merge scripts, dependencies, and devDependencies from source into the
 * package.json at outDir. Writes result back to disk.
 */
function mergePackageJsons(outDir: string, source: Record<string, unknown>): void {
  const target = readPkgJson(outDir);

  // Merge scripts (source overwrites target)
  if (source.scripts) {
    target.scripts = Object.assign(
      {},
      target.scripts as Record<string, unknown>,
      source.scripts as Record<string, unknown>,
    );
  }

  // Merge dependencies (source overwrites target, sort keys)
  if (source.dependencies) {
    const merged = Object.assign(
      {},
      target.dependencies as Record<string, unknown>,
      source.dependencies as Record<string, unknown>,
    );
    target.dependencies = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  }

  // Merge devDependencies (source overwrites target, sort keys)
  if (source.devDependencies) {
    const merged = Object.assign(
      {},
      target.devDependencies as Record<string, unknown>,
      source.devDependencies as Record<string, unknown>,
    );
    target.devDependencies = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  }

  writePkgJson(outDir, target);
}

/**
 * Copy all non-package.json files from a starter into outDir.
 * Renames 'gitignore' -> '.gitignore' during copy.
 */
function copyStarterFiles(starter: IntegrationData, outDir: string): void {
  for (const filePath of starter.filePaths) {
    const srcPath = join(starter.dir, filePath);

    // Rename gitignore -> .gitignore
    const destRelative = filePath
      .split("/")
      .map((segment) => (segment === "gitignore" ? ".gitignore" : segment))
      .join("/");

    const destPath = join(outDir, destRelative);

    // Ensure parent directory exists
    mkdirSync(dirname(destPath), { recursive: true });

    const content = readFileSync(srcPath);
    writeFileSync(destPath, content);
  }
}

/**
 * Apply one or two starter layers to the output directory.
 * - Copies all non-package.json files (renaming gitignore -> .gitignore)
 * - Merges package.json scripts + devDependencies from baseApp
 * - Merges package.json scripts + dependencies + devDependencies from starterApp
 */
function createFromStarter(opts: {
  baseApp: IntegrationData;
  starterApp?: IntegrationData;
  outDir: string;
}): void {
  const { baseApp, starterApp, outDir } = opts;

  // Copy base files
  copyStarterFiles(baseApp, outDir);

  // Merge base package.json (scripts + devDependencies)
  mergePackageJsons(outDir, {
    scripts: baseApp.pkgJson.scripts,
    devDependencies: baseApp.pkgJson.devDependencies,
  });

  if (starterApp) {
    // Copy starter files (overwrite conflicts)
    copyStarterFiles(starterApp, outDir);

    // Merge starter package.json (scripts + dependencies + devDependencies)
    mergePackageJsons(outDir, {
      scripts: starterApp.pkgJson.scripts,
      dependencies: starterApp.pkgJson.dependencies,
      devDependencies: starterApp.pkgJson.devDependencies,
    });
  }
}

/**
 * Scaffold a new Qwik project in the given output directory.
 *
 * Two paths:
 * - library: self-contained (no base merge). baseApp = libraryStarter.
 * - everything else: base + matched starter.
 */
export async function createApp(opts: {
  appId: string;
  outDir: string;
  pkgManager: string;
}): Promise<CreateAppResult> {
  const { appId, outDir } = opts;

  if (!outDir) {
    throw new Error("outDir is required");
  }
  if (!outDir.startsWith("/")) {
    throw new Error(`outDir must be an absolute path, got: ${outDir}`);
  }

  const starters = await loadAppStarters();
  const starterMap = new Map(starters.map((s) => [s.id, s]));

  const baseStarter = starterMap.get("base");
  if (!baseStarter) {
    throw new Error("base starter not found in stubs/apps/");
  }

  const decodedOutDir = decodeURIComponent(outDir);
  mkdirSync(decodedOutDir, { recursive: true });

  let baseApp: IntegrationData;
  let starterApp: IntegrationData | undefined;

  if (appId === "library") {
    const libraryStarter = starterMap.get("library");
    if (!libraryStarter) {
      throw new Error(`library starter not found in stubs/apps/`);
    }
    // Library: self-contained — use library as base, no starterApp merge
    baseApp = libraryStarter;
    starterApp = undefined;
  } else {
    const matched = starterMap.get(appId);
    if (!matched) {
      throw new Error(`Unknown starter: ${appId}`);
    }
    baseApp = baseStarter;
    starterApp = matched;
  }

  // Determine initial name from starter
  const appName = `my-${(baseApp.pkgJson.name as string | undefined) ?? appId}`;

  // Write initial package.json (cleaned, with name set, scripts/deps undefined initially)
  const initialPkg = cleanPackageJson({
    ...baseApp.pkgJson,
    name: appName,
    scripts: undefined,
    dependencies: undefined,
    devDependencies: undefined,
  });
  writePkgJson(decodedOutDir, initialPkg);

  // Apply file layers
  createFromStarter({ baseApp, starterApp, outDir: decodedOutDir });

  return { outDir: decodedOutDir, appId };
}
