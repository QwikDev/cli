import type { ParseResult } from "oxc-parser";

/**
 * A single source replacement to be applied via magic-string.
 * All positions are byte offsets into the original source string.
 */
export interface SourceReplacement {
  start: number;
  end: number;
  replacement: string;
}

/**
 * A transform function that inspects a parsed source file and returns
 * the list of replacements to apply. Transforms must be pure — they
 * only read from `source` and `parseResult`, never write to disk.
 *
 * @param filePath    - Absolute path to the file being transformed
 * @param source      - Raw source text of the file
 * @param parseResult - oxc-parser ParseResult (parse-once, shared across transforms)
 * @returns Array of replacements; return [] for a no-op
 */
export type TransformFn = (
  filePath: string,
  source: string,
  parseResult: ParseResult,
) => SourceReplacement[];
