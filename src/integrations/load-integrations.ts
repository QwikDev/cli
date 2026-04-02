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
 * Discover and load all integrations from stubs/adapters/ and stubs/features/.
 * Caches results after first call.
 */
export async function loadIntegrations(): Promise<IntegrationData[]> {
  if (cache !== null) {
    return cache;
  }

  const integrations: IntegrationData[] = [];

  for (const subdir of ["adapters", "features"] as const) {
    const subdirPath = join(STUBS_DIR, subdir);
    if (!existsSync(subdirPath)) {
      continue;
    }

    const entries = readdirSync(subdirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const itemDir = join(subdirPath, entry.name);
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

      // Skip if no __qwik__ key
      if (!pkgJson.__qwik__) {
        continue;
      }

      const qwikMeta = pkgJson.__qwik__ as Record<string, unknown>;
      const filePaths = collectFilePaths(itemDir, itemDir);

      integrations.push({
        id: entry.name,
        name: (qwikMeta.displayName as string) ?? entry.name,
        pkgJson,
        dir: itemDir,
        filePaths,
      });
    }
  }

  // Sort by priority (descending) then id (ascending)
  integrations.sort((a, b) => {
    const aPriority =
      ((a.pkgJson.__qwik__ as Record<string, unknown>)?.priority as number) ??
      0;
    const bPriority =
      ((b.pkgJson.__qwik__ as Record<string, unknown>)?.priority as number) ??
      0;
    if (bPriority !== aPriority) {
      return bPriority - aPriority;
    }
    return a.id.localeCompare(b.id);
  });

  cache = integrations;
  return cache;
}

/**
 * Build clack select options from integrations list.
 * Groups adapters first (by convention — they're sorted by priority already).
 */
export function sortIntegrationsAndReturnAsClackOptions(
  integrations: IntegrationData[],
): { value: IntegrationData; label: string; hint?: string }[] {
  return integrations.map((integration) => ({
    value: integration,
    label: integration.name,
    hint: integration.id,
  }));
}
