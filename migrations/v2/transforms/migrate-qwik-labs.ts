import type { Node } from "oxc-parser";
import type { ParseResult } from "oxc-parser";
import type { SourceReplacement, TransformFn } from "../types.ts";
import { walkNode } from "./walk.ts";

/**
 * Maps known @builder.io/qwik-labs export names to their v2 equivalents.
 * Each entry specifies the target package and the new exported name.
 */
const KNOWN_LABS_APIS: Record<string, { pkg: string; exportName: string }> = {
  usePreventNavigate: {
    pkg: "@qwik.dev/router",
    exportName: "usePreventNavigate$",
  },
};

const QWIK_LABS_SOURCE = "@builder.io/qwik-labs";

/**
 * AST transform that migrates @builder.io/qwik-labs imports to their v2 equivalents.
 *
 * For each ImportDeclaration from "@builder.io/qwik-labs":
 * - If ALL specifiers are in KNOWN_LABS_APIS: rewrite each specifier's imported name
 *   and the import source to the mapped package. If the import is unaliased, also
 *   rename call sites throughout the file.
 * - If ANY specifier is unknown: rename only the known specifiers (not the source),
 *   and insert a TODO comment before the import for each unknown specifier.
 *
 * This handles:
 * - Plain imports: `import { usePreventNavigate } from "@builder.io/qwik-labs"`
 * - Aliased imports: `import { usePreventNavigate as preventNav } from "@builder.io/qwik-labs"`
 * - Unknown APIs: inserts TODO comment, leaves source unchanged
 * - Mixed known+unknown: renames known, leaves source, adds TODO for unknown
 * - Call site renaming for unaliased imports
 */
export const migrateQwikLabsTransform: TransformFn = (
  _filePath: string,
  source: string,
  parseResult: ParseResult,
): SourceReplacement[] => {
  const replacements: SourceReplacement[] = [];

  // Track which identifiers need call-site renaming (old name -> new name).
  // Only populated for unaliased imports where local.name === imported.name.
  const callSiteRenames = new Map<string, string>();

  // Track import specifier node ranges so we can exclude them from call-site renaming.
  // (The import specifier identifiers themselves are already handled by the import replacements.)
  const importSpecifierRanges: Array<{ start: number; end: number }> = [];

  const program = parseResult.program as unknown as Node;
  const body = (program as unknown as { body: Node[] }).body;

  for (const stmt of body) {
    if (stmt.type !== "ImportDeclaration") continue;

    const importDecl = stmt as unknown as {
      type: string;
      start: number;
      end: number;
      source: { start: number; end: number; value: string };
      specifiers: Array<{
        type: string;
        start: number;
        end: number;
        imported: { start: number; end: number; name: string; type: string };
        local: { start: number; end: number; name: string; type: string };
      }>;
    };

    if (importDecl.source.value !== QWIK_LABS_SOURCE) continue;

    const specifiers = importDecl.specifiers.filter((s) => s.type === "ImportSpecifier");
    if (specifiers.length === 0) continue;

    // Classify each specifier as known or unknown
    const knownSpecifiers = specifiers.filter((s) => s.imported.name in KNOWN_LABS_APIS);
    const unknownSpecifiers = specifiers.filter((s) => !(s.imported.name in KNOWN_LABS_APIS));
    const hasUnknown = unknownSpecifiers.length > 0;

    // Track import specifier ranges (both imported and local identifiers)
    for (const spec of specifiers) {
      importSpecifierRanges.push({ start: spec.start, end: spec.end });
    }

    if (hasUnknown) {
      // Mixed or all-unknown: add TODO comment for unknown specifiers, rename known specifiers only
      const unknownNames = unknownSpecifiers.map((s) => s.imported.name);
      const todoComment = `// TODO: @builder.io/qwik-labs migration — ${unknownNames.join(", ")} has no known v2 equivalent; manual review required\n`;

      // Insert TODO before the import using first-char trick (zero-width overwrite workaround)
      replacements.push({
        start: importDecl.start,
        end: importDecl.start + 1,
        replacement: todoComment + source[importDecl.start],
      });

      // Rename known specifiers' imported names (not the source)
      for (const spec of knownSpecifiers) {
        const mapping = KNOWN_LABS_APIS[spec.imported.name]!;
        replacements.push({
          start: spec.imported.start,
          end: spec.imported.end,
          replacement: mapping.exportName,
        });
        // Even in mixed case, track call site renames for unaliased known imports
        if (spec.local.name === spec.imported.name) {
          callSiteRenames.set(spec.imported.name, mapping.exportName);
        }
      }
    } else {
      // All specifiers are known — determine the target package
      // (if all specifiers map to the same package, rewrite the source; otherwise keep it)
      const targetPkgs = new Set(knownSpecifiers.map((s) => KNOWN_LABS_APIS[s.imported.name]!.pkg));
      const singleTarget = targetPkgs.size === 1 ? [...targetPkgs][0]! : null;

      // Rewrite each specifier's imported name
      for (const spec of knownSpecifiers) {
        const mapping = KNOWN_LABS_APIS[spec.imported.name]!;
        replacements.push({
          start: spec.imported.start,
          end: spec.imported.end,
          replacement: mapping.exportName,
        });

        // Track call site renaming for unaliased imports
        if (spec.local.name === spec.imported.name) {
          callSiteRenames.set(spec.imported.name, mapping.exportName);
        }
      }

      // Rewrite the import source if all specifiers agree on a single target package
      if (singleTarget !== null) {
        // source text includes the quotes — replace them including quote characters
        replacements.push({
          start: importDecl.source.start,
          end: importDecl.source.end,
          replacement: `"${singleTarget}"`,
        });
      }
    }
  }

  // Walk the full AST to find call site identifiers that need renaming.
  // Only rename Identifier nodes that are NOT within import specifier ranges.
  if (callSiteRenames.size > 0) {
    walkNode(program, (node: Node) => {
      if (node.type !== "Identifier") return;

      const ident = node as unknown as {
        type: string;
        start: number;
        end: number;
        name: string;
      };

      const newName = callSiteRenames.get(ident.name);
      if (!newName) return;

      // Skip if this identifier falls within an import specifier range
      const isImportSpecifier = importSpecifierRanges.some(
        (range) => ident.start >= range.start && ident.end <= range.end,
      );
      if (isImportSpecifier) return;

      replacements.push({
        start: ident.start,
        end: ident.end,
        replacement: newName,
      });
    });
  }

  return replacements;
};
