import MagicString from "magic-string";
import { parseSync } from "oxc-parser";
import { readFileSync, writeFileSync } from "node:fs";
import type { SourceReplacement, TransformFn } from "./types.ts";

/**
 * Parse-once, fan-out orchestrator for AST-based source transforms.
 *
 * Algorithm:
 * 1. Early return if no transforms provided
 * 2. Read source from disk once
 * 3. Parse once with oxc-parser; share ParseResult across all transforms
 * 4. Fan out: collect SourceReplacement[] from each transform into a flat list
 * 5. Early return if no replacements collected (file unchanged)
 * 6. Sort replacements descending by `start` (later offsets first) to prevent
 *    MagicString offset corruption when applying earlier edits
 * 7. Apply all replacements via a single MagicString instance
 * 8. Write back to disk only if content changed
 *
 * @param filePath   - Absolute path to the file to transform
 * @param transforms - Array of transform functions to apply
 */
export function applyTransforms(filePath: string, transforms: TransformFn[]): void {
  // Step 1: Early return for empty transform list
  if (transforms.length === 0) return;

  // Step 2: Read source once
  const source = readFileSync(filePath, "utf-8");

  // Step 3: Parse once
  const parseResult = parseSync(filePath, source, { sourceType: "module" });

  // Step 4: Fan out — collect all replacements
  const allReplacements: SourceReplacement[] = [];
  for (const transform of transforms) {
    const replacements = transform(filePath, source, parseResult);
    allReplacements.push(...replacements);
  }

  // Step 5: Early return if nothing to replace
  if (allReplacements.length === 0) return;

  // Step 6: Sort descending by start so later offsets are applied first
  allReplacements.sort((a, b) => b.start - a.start);

  // Step 6b: Detect overlapping replacements before applying (magic-string does not
  // always throw a useful error; we surface a descriptive one instead).
  // After descending sort, replacement[i].start >= replacement[i+1].start.
  // A collision occurs when replacement[i+1].end > replacement[i].start.
  for (let i = 0; i < allReplacements.length - 1; i++) {
    const curr = allReplacements[i]!;
    const next = allReplacements[i + 1]!;
    if (next.end > curr.start) {
      throw new Error(
        `applyTransforms: overlapping replacements detected in "${filePath}". ` +
          `Replacement at [${next.start}, ${next.end}) overlaps with [${curr.start}, ${curr.end}). ` +
          `Each transform must produce non-overlapping SourceReplacement ranges.`,
      );
    }
  }

  // Step 7: Apply via single MagicString instance
  const ms = new MagicString(source);
  for (const { start, end, replacement } of allReplacements) {
    ms.overwrite(start, end, replacement);
  }

  // Step 8: Write back only when content changed
  if (ms.hasChanged()) {
    writeFileSync(filePath, ms.toString(), "utf-8");
  }
}
