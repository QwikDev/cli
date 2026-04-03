import MagicString from "magic-string";
import { parseSync } from "oxc-parser";
import { readFileSync, writeFileSync } from "node:fs";

/** Tuple of [oldSpecifierName, newSpecifierName] */
export type ImportRename = [oldName: string, newName: string];

/** A single round of import renaming: a library prefix and the renames to apply */
export interface ImportRenameRound {
  library: string;
  changes: ImportRename[];
}

/**
 * The 3 rounds of import renaming to perform during v1→v2 migration.
 *
 * Round 1: Rename qwik-city provider/config/plugin imports
 * Round 2: Rename routeAction$ → globalAction$ (same library prefix)
 * Round 3: Rename deprecated qwik core imports
 */
export const IMPORT_RENAME_ROUNDS: ImportRenameRound[] = [
  {
    library: "@builder.io/qwik-city",
    changes: [
      ["QwikCityProvider", "QwikRouterProvider"],
      ["QwikCityPlan", "QwikRouterConfig"],
      ["qwikCity", "qwikRouter"],
      ["QwikCityMockProvider", "QwikRouterMockProvider"], // RNME-01
      ["QwikCityProps", "QwikRouterProps"], // RNME-02
    ],
  },
  {
    library: "@builder.io/qwik-city",
    changes: [["routeAction$", "globalAction$"]],
  },
  {
    library: "@builder.io/qwik",
    changes: [
      ["useClientEffect$", "useVisibleTask$"],
      ["useMount$", "useTask$"],
      ["useServerMount$", "useTask$"],
      ["createContext", "createContextId"],
    ],
  },
];

/**
 * Rename import specifiers in .ts/.tsx files using oxc-parser AST and magic-string.
 *
 * For each file that ends with .ts or .tsx:
 * 1. Parse to AST with oxc-parser
 * 2. Find ImportDeclaration nodes from the target library
 * 3. For each specifier matching an oldName, overwrite with newName
 * 4. Also overwrite the local binding if it was unaliased (local.name === oldName)
 * 5. Write file back only if changes were made
 *
 * @param changes - Array of [oldName, newName] pairs
 * @param library - Import path prefix to match (e.g. "@builder.io/qwik-city")
 * @param filePaths - Absolute or cwd-relative file paths to process
 */
function getModuleExportName(node: import("oxc-parser").ModuleExportName): string {
  if (node.type === "Literal") {
    return node.value;
  }
  return node.name;
}

export function replaceImportInFiles(
  changes: ImportRename[],
  library: string,
  filePaths: string[],
): void {
  if (changes.length === 0) return;

  // Build a quick lookup: oldName → newName
  const changeMap = new Map<string, string>(changes);

  for (const filePath of filePaths) {
    if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
      continue;
    }

    let source: string;
    try {
      source = readFileSync(filePath, "utf-8");
    } catch {
      // File not readable — skip
      continue;
    }

    const { program } = parseSync(filePath, source, { sourceType: "module" });
    const ms = new MagicString(source);
    let modified = false;

    for (const node of program.body) {
      if (node.type !== "ImportDeclaration") continue;

      // Check if this import is from the target library (or a sub-path of it)
      const importSource = node.source.value as string;
      if (!importSource.startsWith(library)) continue;

      for (const specifier of node.specifiers) {
        if (specifier.type !== "ImportSpecifier") continue;

        const importedName = getModuleExportName(specifier.imported);
        const newName = changeMap.get(importedName);
        if (newName === undefined) continue;

        // Always rename the imported identifier (the "as" clause left side)
        ms.overwrite(specifier.imported.start, specifier.imported.end, newName);
        modified = true;

        // Only rename the local binding if it was NOT aliased
        // (i.e. "import { foo }" not "import { foo as bar }")
        // We detect this by checking if local.name === oldName AND
        // local has the same start position as imported (unaliased syntax).
        const localName: string = specifier.local.name;
        if (localName === importedName) {
          // Unaliased — also rename the local binding
          ms.overwrite(specifier.local.start, specifier.local.end, newName);
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, ms.toString(), "utf-8");
    }
  }
}
