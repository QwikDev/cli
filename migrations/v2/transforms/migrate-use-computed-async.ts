import type { Node } from "oxc-parser";
import type { ParseResult } from "oxc-parser";
import type { SourceReplacement, TransformFn } from "../types.ts";
import { walkNode } from "./walk.ts";

const QWIK_SOURCES = ["@qwik.dev/core", "@builder.io/qwik"];

/**
 * AST transform that migrates `useComputed$(async () => ...)` calls to `useAsync$`.
 *
 * In Qwik v2, async computed values should use `useAsync$` instead of `useComputed$`.
 * This transform only rewrites call sites where the first argument is an async function —
 * synchronous `useComputed$` calls are deliberately left unchanged.
 *
 * Behaviors:
 * 1. `useComputed$(async () => ...)` — callee rewritten to `useAsync$`
 * 2. Import specifier `useComputed$` renamed to `useAsync$` when ALL usages are async
 * 3. Both `@qwik.dev/core` and `@builder.io/qwik` matched as import sources
 * 4. Sync `useComputed$(() => ...)` is NOT rewritten
 * 5. Mixed sync+async in same file — async call sites rewritten, import not renamed, TODO added
 * 6. Works at any nesting depth (e.g., inside `component$`)
 * 7. No `useComputed$` — returns empty replacements
 */
export const migrateUseComputedAsyncTransform: TransformFn = (
  _filePath: string,
  source: string,
  parseResult: ParseResult,
): SourceReplacement[] => {
  const replacements: SourceReplacement[] = [];

  const program = parseResult.program as unknown as Node;

  // Track async and sync useComputed$ call sites
  const asyncCallSites: Array<{ callee: { start: number; end: number } }> = [];
  let hasSyncUsage = false;

  // Type for CallExpression callee + arguments
  type CallNode = {
    type: string;
    start: number;
    end: number;
    callee: { type: string; name: string; start: number; end: number };
    arguments: Array<{
      type: string;
      async?: boolean;
      start: number;
      end: number;
    }>;
  };

  walkNode(program, (node: Node) => {
    if (node.type !== "CallExpression") return;

    const call = node as unknown as CallNode;

    if (call.callee.type !== "Identifier" || call.callee.name !== "useComputed$") return;
    if (call.arguments.length === 0) return;

    const firstArg = call.arguments[0]!;
    const isAsync =
      (firstArg.type === "ArrowFunctionExpression" || firstArg.type === "FunctionExpression") &&
      firstArg.async === true;

    if (isAsync) {
      asyncCallSites.push({ callee: call.callee });
    } else {
      hasSyncUsage = true;
    }
  });

  // No async usages — nothing to do
  if (asyncCallSites.length === 0) return [];

  // Rewrite each async call site: replace callee `useComputed$` with `useAsync$`
  for (const { callee } of asyncCallSites) {
    replacements.push({
      start: callee.start,
      end: callee.end,
      replacement: "useAsync$",
    });
  }

  // Handle import specifier rewriting
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
        imported: { start: number; end: number; name: string };
        local: { start: number; end: number; name: string };
      }>;
    };

    if (!QWIK_SOURCES.includes(importDecl.source.value)) continue;

    const specifier = importDecl.specifiers.find(
      (s) => s.type === "ImportSpecifier" && s.imported.name === "useComputed$",
    );
    if (!specifier) continue;

    if (hasSyncUsage) {
      // Mixed sync + async: do NOT rename the import; instead, insert a TODO comment
      const todoComment = `// TODO: This file uses both useComputed$ (sync) and useAsync$ (async); remove useComputed$ from imports if no sync usages remain\n`;
      replacements.push({
        start: importDecl.start,
        end: importDecl.start + 1,
        replacement: todoComment + source[importDecl.start],
      });
    } else {
      // All async: rename the import specifier
      replacements.push({
        start: specifier.imported.start,
        end: specifier.imported.end,
        replacement: "useAsync$",
      });

      // If unaliased (local name matches imported name), also rename the local binding
      if (specifier.local.name === specifier.imported.name) {
        // The local identifier is the same text node when unaliased — specifier.local covers it
        // But we need to avoid double-replacing if imported and local occupy the same range
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
  }

  return replacements;
};
