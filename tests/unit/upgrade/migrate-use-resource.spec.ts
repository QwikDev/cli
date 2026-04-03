import { describe, expect, it } from "vitest";
import { parseSync } from "oxc-parser";
import MagicString from "magic-string";
import { migrateUseResourceTransform } from "../../../migrations/v2/transforms/migrate-use-resource.ts";
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
  const replacements = migrateUseResourceTransform(filePath, source, parseResult);
  return applyReplacements(source, replacements);
}

// -----------------------------------------------------------------------
// Test 1: useResource$ call — callee rewritten to useAsync$
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - useResource$ call: rewrites callee to useAsync$", () => {
  it("rewrites useResource$(async ({ track, cleanup }) => ...) to useAsync$", () => {
    const source = `const res = useResource$(async ({ track, cleanup }) => {
  track(() => props.id);
  return await fetchData(props.id);
});`;
    const result = transform(source);
    expect(result).toContain("useAsync$");
    expect(result).not.toContain("useResource$");
  });
});

// -----------------------------------------------------------------------
// Test 2: Import from @qwik.dev/core — import specifier renamed
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - import from @qwik.dev/core: specifier renamed", () => {
  it("rewrites useResource$ to useAsync$ in import specifier from @qwik.dev/core", () => {
    const source = `import { useResource$ } from "@qwik.dev/core";
const res = useResource$(async ({ track }) => {
  return await fetchData();
});`;
    const result = transform(source);
    expect(result).toContain('import { useAsync$ } from "@qwik.dev/core"');
    expect(result).not.toContain("useResource$");
  });
});

// -----------------------------------------------------------------------
// Test 3: Import from @builder.io/qwik — also matched as import source
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - import from @builder.io/qwik: specifier renamed", () => {
  it("rewrites useResource$ to useAsync$ in import specifier from @builder.io/qwik", () => {
    const source = `import { useResource$ } from "@builder.io/qwik";
const res = useResource$(async ({ track }) => {
  return await fetchData();
});`;
    const result = transform(source);
    expect(result).toContain('import { useAsync$ } from "@builder.io/qwik"');
    expect(result).not.toContain("useResource$");
  });
});

// -----------------------------------------------------------------------
// Test 4: TODO comment added about return type change
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - TODO comment: return type change noted", () => {
  it("inserts TODO comment about ResourceReturn vs AsyncSignal before the call statement", () => {
    const source = `const res = useResource$(async ({ track }) => {
  return await fetchData();
});`;
    const result = transform(source);
    expect(result).toContain("TODO:");
    expect(result).toContain("useAsync$");
    // TODO should appear before the call
    const todoIdx = result.indexOf("TODO:");
    const callIdx = result.indexOf("useAsync$");
    expect(todoIdx).toBeLessThan(callIdx);
  });
});

// -----------------------------------------------------------------------
// Test 5: Nested in component$ — deeply nested useResource$ is found
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - nested in component$: deep traversal finds the call", () => {
  it("transforms useResource$ nested inside component$ callback", () => {
    const source = `export default component$(() => {
  const res = useResource$(async ({ track }) => {
    return await loadData();
  });
})`;
    const result = transform(source);
    expect(result).toContain("useAsync$(async ({ track }) => {");
    expect(result).not.toContain("useResource$");
  });
});

// -----------------------------------------------------------------------
// Test 6: Multiple useResource$ calls — all rewritten
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - multiple calls: all rewritten", () => {
  it("rewrites all useResource$ call sites in one file", () => {
    const source = `const res1 = useResource$(async ({ track }) => {
  return await fetchFirst();
});
const res2 = useResource$(async ({ track, cleanup }) => {
  return await fetchSecond();
});`;
    const result = transform(source);
    expect(result).not.toContain("useResource$");
    const asyncCount = (result.match(/useAsync\$/g) || []).length;
    expect(asyncCount).toBe(2);
  });
});

// -----------------------------------------------------------------------
// Test 7: No useResource$ — returns empty replacements
// -----------------------------------------------------------------------
describe("migrateUseResourceTransform - no useResource$: returns empty replacements", () => {
  it("returns empty replacements when no useResource$ is present", () => {
    const source = `const x = useTask$(async () => doWork());`;
    const filePath = "test.ts";
    const parseResult = parseSync(filePath, source, { sourceType: "module" });
    const replacements = migrateUseResourceTransform(filePath, source, parseResult);
    expect(replacements).toHaveLength(0);
  });
});
