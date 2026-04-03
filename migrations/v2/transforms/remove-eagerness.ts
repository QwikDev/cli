import type { Node } from "oxc-parser";
import type { ParseResult } from "oxc-parser";
import type { SourceReplacement, TransformFn } from "../types.ts";

/**
 * Recursively walk an AST node, visiting every child node.
 * Iterates over all values of a node: arrays have each element with a `type`
 * property walked; objects with a `type` property are walked directly.
 */
function walkNode(node: Node, visitor: (node: Node) => void): void {
  visitor(node);

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && typeof item === "object" && typeof item.type === "string") {
          walkNode(item as Node, visitor);
        }
      }
    } else if (value !== null && typeof value === "object" && typeof value.type === "string") {
      walkNode(value as Node, visitor);
    }
  }
}

/**
 * AST transform that removes the `eagerness` option from `useVisibleTask$` calls.
 *
 * In Qwik v2, `useVisibleTask$` no longer accepts an `eagerness` option.
 * This transform strips the option automatically so developers don't need to
 * find and remove every instance by hand.
 *
 * Handles three cases:
 * 1. Solo eagerness prop: `useVisibleTask$({eagerness: 'load'}, cb)` → `useVisibleTask$(cb)`
 * 2. Eagerness first: `useVisibleTask$({eagerness: 'load', strategy: 'x'}, cb)` → `useVisibleTask$({strategy: 'x'}, cb)`
 * 3. Eagerness last: `useVisibleTask$({strategy: 'x', eagerness: 'load'}, cb)` → `useVisibleTask$({strategy: 'x'}, cb)`
 *
 * Safely ignores:
 * - Single-arg form: `useVisibleTask$(cb)` (no options object)
 * - Options without eagerness: `useVisibleTask$({strategy: 'x'}, cb)`
 *
 * Works at any nesting depth — deeply embedded calls inside `component$` callbacks are found.
 */
export const removeEagernessTransform: TransformFn = (
  _filePath: string,
  source: string,
  parseResult: ParseResult,
): SourceReplacement[] => {
  const replacements: SourceReplacement[] = [];

  const program = parseResult.program as unknown as Node;

  walkNode(program, (node: Node) => {
    // Only process CallExpressions
    if (node.type !== "CallExpression") return;

    const call = node as unknown as {
      type: string;
      callee: { type: string; name: string };
      arguments: Array<{
        type: string;
        start: number;
        end: number;
        properties?: Array<{
          type: string;
          start: number;
          end: number;
          key: { type: string; name: string };
        }>;
      }>;
      start: number;
      end: number;
    };

    // Guard: must be `useVisibleTask$(...)` identifier call
    if (call.callee.type !== "Identifier" || call.callee.name !== "useVisibleTask$") return;

    // Guard: must have at least 2 arguments, first must be an ObjectExpression
    if (call.arguments.length < 2 || call.arguments[0]!.type !== "ObjectExpression") return;

    const opts = call.arguments[0]!;
    const properties = opts.properties ?? [];

    // Find the eagerness property
    const eagernessIdx = properties.findIndex(
      (p) => p.type === "Property" && p.key.type === "Identifier" && p.key.name === "eagerness",
    );

    // No eagerness property — nothing to do
    if (eagernessIdx === -1) return;

    if (properties.length === 1) {
      // Solo eagerness: remove the entire first argument including the trailing ", "
      // opts.start to args[1].start covers: `{eagerness: 'load'}, `
      const secondArgStart = call.arguments[1]!.start;
      replacements.push({
        start: opts.start,
        end: secondArgStart,
        replacement: "",
      });
    } else {
      // Multiple properties: keep the remaining ones, reconstruct the object
      const remaining = properties.filter((_, i) => i !== eagernessIdx);
      const newOpts = "{" + remaining.map((p) => source.slice(p.start, p.end)).join(", ") + "}";
      replacements.push({
        start: opts.start,
        end: opts.end,
        replacement: newOpts,
      });
    }
  });

  return replacements;
};
