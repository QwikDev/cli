import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * CONF-01: Rewrite jsxImportSource in tsconfig.json from @builder.io/qwik to @qwik.dev/core.
 *
 * - Operates on raw string (preserves JSONC comments).
 * - Idempotent: no-op if already set to @qwik.dev/core.
 * - Silent no-op if tsconfig.json does not exist.
 *
 * @param rootDir - Absolute path to the project root
 */
export function fixJsxImportSource(rootDir: string): void {
  const tsconfigPath = join(rootDir, "tsconfig.json");
  let content: string;
  try {
    content = readFileSync(tsconfigPath, "utf-8");
  } catch {
    return; // ENOENT or unreadable — silently skip
  }

  const updated = content.replace(
    /"jsxImportSource"\s*:\s*"@builder\.io\/qwik"/g,
    '"jsxImportSource": "@qwik.dev/core"',
  );

  if (updated !== content) {
    writeFileSync(tsconfigPath, updated, "utf-8");
  }
}

/**
 * CONF-02: Rewrite moduleResolution in tsconfig.json from Node/Node16 to Bundler.
 *
 * - Case-insensitive: matches "node", "Node", "NODE", "Node16", "node16".
 * - Idempotent: no-op if already set to Bundler.
 * - Silent no-op if tsconfig.json does not exist.
 *
 * @param rootDir - Absolute path to the project root
 */
export function fixModuleResolution(rootDir: string): void {
  const tsconfigPath = join(rootDir, "tsconfig.json");
  let content: string;
  try {
    content = readFileSync(tsconfigPath, "utf-8");
  } catch {
    return; // ENOENT or unreadable — silently skip
  }

  const updated = content.replace(
    /"moduleResolution"\s*:\s*"Node(?:16)?"/gi,
    '"moduleResolution": "Bundler"',
  );

  if (updated !== content) {
    writeFileSync(tsconfigPath, updated, "utf-8");
  }
}

/**
 * CONF-03: Add `"type": "module"` to package.json when absent.
 *
 * - Uses JSON.parse/stringify (standard JSON, no comments).
 * - Idempotent: no-op if type is already "module".
 * - Silent no-op if package.json does not exist.
 * - Output always ends with a trailing newline.
 *
 * @param rootDir - Absolute path to the project root
 */
export function fixPackageType(rootDir: string): void {
  const pkgPath = join(rootDir, "package.json");
  let raw: string;
  try {
    raw = readFileSync(pkgPath, "utf-8");
  } catch {
    return; // ENOENT or unreadable — silently skip
  }

  const obj = JSON.parse(raw) as Record<string, unknown>;
  if (obj["type"] === "module") {
    return; // already set — idempotent
  }

  obj["type"] = "module";
  writeFileSync(pkgPath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}
