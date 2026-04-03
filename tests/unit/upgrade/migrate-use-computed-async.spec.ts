import { describe, expect, it } from "vitest";
import { parseSync } from "oxc-parser";
import MagicString from "magic-string";
import { migrateUseComputedAsyncTransform } from "../../../migrations/v2/transforms/migrate-use-computed-async.ts";
import type { SourceReplacement } from "../../../migrations/v2/types.ts";

/**
 * Apply a list of SourceReplacements to a source string using MagicString.
 * Mirrors the logic in applyTransforms — sort descending by start, then overwrite.
 * This is inlined here for test isolation (no file I/O needed).
 */
function applyReplacements(source: string, replacements: SourceReplacement[]): string {
  if (replacements.length === 0) return source;
  const sorted = [...replacements].sort((a, b) => b.start - a.start);
  const ms = new MagicString(source);
  for (const { start, end, replacement } of sorted) {
    ms.overwrite(start, end, replacement);
  }
  return ms.toString();
}

function transform(source: string): string {
  const filePath = "test.ts";
  const parseResult = parseSync(filePath, source, { sourceType: "module" });
  const replacements = migrateUseComputedAsyncTransform(filePath, source, parseResult);
  return applyReplacements(source, replacements);
}

// -----------------------------------------------------------------------
// Test 1: Async useComputed$ — callee rewritten to useAsync$
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - async useComputed$: rewrites callee to useAsync$", () => {
  it("rewrites useComputed$(async () => ...) to useAsync$(async () => ...)", () => {
    const source = `const data = useComputed$(async () => await fetchData());`;
    const result = transform(source);
    expect(result).toContain("useAsync$");
    expect(result).not.toContain("useComputed$");
  });
});

// -----------------------------------------------------------------------
// Test 2: Import from @qwik.dev/core — import specifier rewritten when all usages are async
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - import from @qwik.dev/core: specifier renamed", () => {
  it("rewrites useComputed$ to useAsync$ in import when all usages are async", () => {
    const source = `import { useComputed$ } from "@qwik.dev/core";
const data = useComputed$(async () => await fetchData());`;
    const result = transform(source);
    expect(result).toContain('import { useAsync$ } from "@qwik.dev/core"');
    expect(result).not.toContain("useComputed$");
  });
});

// -----------------------------------------------------------------------
// Test 3: Import from @builder.io/qwik — also matched as import source
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - import from @builder.io/qwik: specifier renamed", () => {
  it("rewrites useComputed$ to useAsync$ in import from @builder.io/qwik when all usages are async", () => {
    const source = `import { useComputed$ } from "@builder.io/qwik";
const data = useComputed$(async () => await fetchData());`;
    const result = transform(source);
    expect(result).toContain('import { useAsync$ } from "@builder.io/qwik"');
    expect(result).not.toContain("useComputed$");
  });
});

// -----------------------------------------------------------------------
// Test 4: Sync useComputed$ — NOT rewritten
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - sync useComputed$: NOT rewritten", () => {
  it("returns empty replacements for sync useComputed$(() => x + y)", () => {
    const source = `const sum = useComputed$(() => x + y);`;
    const filePath = "test.ts";
    const parseResult = parseSync(filePath, source, { sourceType: "module" });
    const replacements = migrateUseComputedAsyncTransform(filePath, source, parseResult);
    expect(replacements).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// Test 5: Mixed sync + async in same file — async rewritten, sync left alone, TODO added
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - mixed sync+async: async rewritten, sync left, TODO added", () => {
  it("rewrites only async useComputed$ calls and inserts TODO comment on import", () => {
    const source = `import { useComputed$ } from "@qwik.dev/core";
const sync = useComputed$(() => x + y);
const async_ = useComputed$(async () => await fetchData());`;
    const result = transform(source);
    // Async call site rewritten
    expect(result).toContain("useAsync$(async () => await fetchData())");
    // Sync call site NOT rewritten
    expect(result).toContain("useComputed$(() => x + y)");
    // Import NOT renamed (mixed usage) — useComputed$ still present
    expect(result).toContain("useComputed$");
    // TODO comment added above import
    expect(result).toContain("TODO:");
  });
});

// -----------------------------------------------------------------------
// Test 6: Nested in component$ — deeply nested async useComputed$ is found and transformed
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - nested in component$: deep traversal finds the call", () => {
  it("transforms useComputed$(async ...) nested inside component$ callback", () => {
    const source = `export default component$(() => {
  const data = useComputed$(async () => {
    return await loadData();
  });
})`;
    const result = transform(source);
    expect(result).toContain("useAsync$(async () => {");
    expect(result).not.toContain("useComputed$");
  });
});

// -----------------------------------------------------------------------
// Test 7: No useComputed$ — returns empty replacements
// -----------------------------------------------------------------------
describe("migrateUseComputedAsyncTransform - no useComputed$: returns empty replacements", () => {
  it("returns empty replacements when no useComputed$ is present", () => {
    const source = `const x = useTask$(async () => doWork());`;
    const filePath = "test.ts";
    const parseResult = parseSync(filePath, source, { sourceType: "module" });
    const replacements = migrateUseComputedAsyncTransform(filePath, source, parseResult);
    expect(replacements).toHaveLength(0);
  });
});
