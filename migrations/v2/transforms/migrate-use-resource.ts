import type { Node } from "oxc-parser";
import type { ParseResult } from "oxc-parser";
import type { SourceReplacement, TransformFn } from "../types.ts";
import { walkNode } from "./walk.ts";

const QWIK_SOURCES = ["@qwik.dev/core", "@builder.io/qwik"];

const USE_RESOURCE_TODO = `// TODO: useResource$ -> useAsync$ migration — return type changed from ResourceReturn<T> (.value is Promise<T>) to AsyncSignal<T> (.value is T). Review .value usage and <Resource> component usage.\n`;

/**
 * AST transform that migrates `useResource$` calls to `useAsync$`.
 *
 * In Qwik v2, `useResource$` is deprecated. The replacement is `useAsync$`.
 * Key difference: `ResourceReturn<T>.value` is `Promise<T>`, while
 * `AsyncSignal<T>.value` is the resolved `T` — callers must be updated.
 *
 * Behaviors:
 * 1. `useResource$(async ({ track, cleanup }) => ...)` — callee rewritten to `useAsync$`
 * 2. Import specifier `useResource$` renamed to `useAsync$` (both @qwik.dev/core and @builder.io/qwik)
 * 3. TODO comment inserted before each call site about the return type change
 * 4. Works at any nesting depth (e.g., inside `component$`)
 * 5. Multiple `useResource$` calls in one file — all rewritten
 * 6. No `useResource$` — returns empty replacements
 */
export const migrateUseResourceTransform: TransformFn = (
  _filePath: string,
  source: string,
  parseResult: ParseResult,
): SourceReplacement[] => {
  const replacements: SourceReplacement[] = [];

  const program = parseResult.program as unknown as Node;

  type CallNode = {
    type: string;
    start: number;
    end: number;
    callee: { type: string; name: string; start: number; end: number };
    arguments: Array<{ type: string; start: number; end: number }>;
  };

  // Collect all useResource$ call sites
  const callSites: CallNode[] = [];

  walkNode(program, (node: Node) => {
    if (node.type !== "CallExpression") return;

    const call = node as unknown as CallNode;
    if (call.callee.type !== "Identifier" || call.callee.name !== "useResource$") return;

    callSites.push(call);
  });

  if (callSites.length === 0) return [];

  // Build a map from call start -> enclosing statement start for TODO insertion
  // We walk the body to find ExpressionStatement or VariableDeclaration containing each call
  const body = (program as unknown as { body: Node[] }).body;

  // Helper: find the statement in body that contains a given call start position
  function findEnclosingStatementStart(callStart: number): number | null {
    for (const stmt of body) {
      const s = stmt as unknown as { start: number; end: number };
      if (s.start <= callStart && callStart <= s.end) {
        return s.start;
      }
    }
    return null;
  }

  // Track statement starts that already have a TODO comment inserted to avoid duplicates
  const todoInserted = new Set<number>();

  for (const call of callSites) {
    // Rewrite the callee from useResource$ to useAsync$
    replacements.push({
      start: call.callee.start,
      end: call.callee.end,
      replacement: "useAsync$",
    });

    // Insert TODO comment before the enclosing statement
    const stmtStart = findEnclosingStatementStart(call.start);
    const insertAt = stmtStart ?? call.start;

    if (!todoInserted.has(insertAt)) {
      todoInserted.add(insertAt);
      replacements.push({
        start: insertAt,
        end: insertAt + 1,
        replacement: USE_RESOURCE_TODO + source[insertAt],
      });
    }
  }

  // Handle import specifier rewriting
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
        imported: { start: number; end: number; name: string };
        local: { start: number; end: number; name: string };
      }>;
    };

    if (!QWIK_SOURCES.includes(importDecl.source.value)) continue;

    const specifier = importDecl.specifiers.find(
      (s) => s.type === "ImportSpecifier" && s.imported.name === "useResource$",
    );
    if (!specifier) continue;

    // Rename the imported specifier
    replacements.push({
      start: specifier.imported.start,
      end: specifier.imported.end,
      replacement: "useAsync$",
    });

    // If unaliased, also rename the local binding if it occupies a different range
    if (specifier.local.name === specifier.imported.name) {
      if (
        specifier.local.start !== specifier.imported.start ||
        specifier.local.end !== specifier.imported.end
      ) {
        replacements.push({
          start: specifier.local.start,
          end: specifier.local.end,
          replacement: "useAsync$",
        });
      }
    }
  }

  return replacements;
};
