import { join } from "node:path";
import { applyTransforms } from "./apply-transforms.ts";
import { fixJsxImportSource, fixModuleResolution, fixPackageType } from "./fix-config.ts";
import { IMPORT_RENAME_ROUNDS, replaceImportInFiles } from "./rename-import.ts";
import { runAllPackageReplacements } from "./replace-package.ts";
import { removeEagernessTransform } from "./transforms/remove-eagerness.ts";
import {
  checkTsMorphPreExisting,
  removeTsMorphFromPackageJson,
  updateDependencies,
} from "./update-dependencies.ts";
import { resolveV2Versions } from "./versions.ts";
import { visitNotIgnoredFiles } from "./visit-not-ignored.ts";

/**
 * Run the full 5-step v1→v2 migration in the given project root.
 *
 * Steps:
 * 1. Check ts-morph pre-existence (idempotency guard)
 * 2. AST import rename via oxc-parser + magic-string
 * 2b. Behavioral AST transforms (eagerness removal, etc.)
 * 3. Text-based package string replacement (substring-safe order)
 * 3b. Config validation (jsxImportSource, moduleResolution, package type)
 * 4. Conditionally remove ts-morph (only if it was NOT pre-existing)
 * 5. Resolve v2 versions and update dependencies
 *
 * @param rootDir - Absolute path to the project root
 */
export async function runV2Migration(rootDir: string): Promise<void> {
  // Step 1: Check ts-morph pre-existence (idempotency guard)
  console.log("Step 1: Checking ts-morph pre-existence...");
  const tsMorphWasPreExisting = checkTsMorphPreExisting(rootDir);

  // Step 2: AST import rename (oxc-parser + magic-string)
  console.log("Step 2: Renaming imports...");
  const collectedPaths: string[] = [];

  // Temporarily change cwd to rootDir so visitNotIgnoredFiles resolves paths correctly
  const origCwd = process.cwd();
  process.chdir(rootDir);
  try {
    await visitNotIgnoredFiles(rootDir, (relPath) => {
      if (relPath.endsWith(".ts") || relPath.endsWith(".tsx")) {
        collectedPaths.push(relPath);
      }
    });
  } finally {
    process.chdir(origCwd);
  }

  // Convert relative paths to absolute paths for replaceImportInFiles
  const absolutePaths = collectedPaths.map((relPath) => join(rootDir, relPath));

  for (const round of IMPORT_RENAME_ROUNDS) {
    replaceImportInFiles(round.changes, round.library, absolutePaths);
  }

  // Step 2b: Behavioral AST transforms
  console.log("Step 2b: Applying behavioral transforms...");
  for (const filePath of absolutePaths) {
    applyTransforms(filePath, [removeEagernessTransform]);
  }

  // Step 3: Text-based package replacement (substring-safe order)
  console.log("Step 3: Replacing package names...");
  process.chdir(rootDir);
  try {
    await runAllPackageReplacements();
  } finally {
    process.chdir(origCwd);
  }

  // Step 3b: Validate config files
  console.log("Step 3b: Validating config files...");
  fixJsxImportSource(rootDir);
  fixModuleResolution(rootDir);
  fixPackageType(rootDir);

  // Step 4: Conditionally remove ts-morph
  console.log("Step 4: Cleaning up ts-morph...");
  if (!tsMorphWasPreExisting) {
    removeTsMorphFromPackageJson(rootDir);
  }

  // Step 5: Resolve versions and update dependencies
  console.log("Step 5: Updating dependencies...");
  const versions = resolveV2Versions();
  await updateDependencies(rootDir, versions);

  console.log("Migration complete.");
}
