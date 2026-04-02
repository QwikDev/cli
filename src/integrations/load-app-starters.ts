import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { IntegrationData } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the stubs/ directory relative to this file.
 * Source: src/integrations/ -> 2 levels up to project root
 * Compiled: dist/src/integrations/ -> 3 levels up to project root
 *
 * We detect the context by checking if the 2-level path contains stubs/.
 * When compiled output resides under dist/, we need the extra level.
 */
function resolveStubsDir(): string {
  const twoUp = join(__dirname, "..", "..", "stubs");
  if (existsSync(twoUp)) {
    return twoUp;
  }
  return join(__dirname, "..", "..", "..", "stubs");
}

const STUBS_DIR = resolveStubsDir();

let cache: IntegrationData[] | null = null;

/**
 * Clear the module-level cache. Useful for testing.
 */
export function clearAppStartersCache(): void {
  cache = null;
}

/**
 * Recursively collect all file paths under dir, returning paths relative to baseDir.
 * Excludes package.json itself.
 */
function collectFilePaths(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = fullPath.slice(baseDir.length + 1); // relative to baseDir
    if (entry.isSymbolicLink()) {
      // Skip symlinks (OQ-07 deferred decision)
      continue;
    }
    if (entry.isDirectory()) {
      results.push(...collectFilePaths(fullPath, baseDir));
    } else if (entry.isFile() && entry.name !== "package.json") {
      results.push(relativePath);
    }
  }
  return results;
}

/**
 * Discover and load all app starters from stubs/apps/.
 * Unlike loadIntegrations(), does NOT filter by __qwik__ presence —
 * the base starter intentionally has no __qwik__ key.
 * Caches results after first call.
 */
export async function loadAppStarters(): Promise<IntegrationData[]> {
  if (cache !== null) {
    return cache;
  }

  const starters: IntegrationData[] = [];

  const appsDir = join(STUBS_DIR, "apps");
  if (!existsSync(appsDir)) {
    cache = starters;
    return cache;
  }

  const entries = readdirSync(appsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const itemDir = join(appsDir, entry.name);
    const pkgJsonPath = join(itemDir, "package.json");

    if (!existsSync(pkgJsonPath)) {
      continue;
    }

    let pkgJson: Record<string, unknown>;
    try {
      pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    } catch {
      continue;
    }

    // For base starter: use directory name as display name (no __qwik__ key)
    const qwikMeta = pkgJson.__qwik__ as Record<string, unknown> | undefined;
    const displayName = (qwikMeta?.displayName as string | undefined) ?? entry.name;
    const filePaths = collectFilePaths(itemDir, itemDir);

    starters.push({
      id: entry.name,
      name: displayName,
      pkgJson,
      dir: itemDir,
      filePaths,
    });
  }

  // Sort by priority (descending) then id (ascending)
  starters.sort((a, b) => {
    const aPriority = ((a.pkgJson.__qwik__ as Record<string, unknown> | undefined)?.priority as number) ?? 0;
    const bPriority = ((b.pkgJson.__qwik__ as Record<string, unknown> | undefined)?.priority as number) ?? 0;
    if (bPriority !== aPriority) {
      return bPriority - aPriority;
    }
    return a.id.localeCompare(b.id);
  });

  cache = starters;
  return cache;
}
