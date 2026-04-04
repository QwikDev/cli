import { describe, expect, it } from "vitest";
import { parseSync } from "oxc-parser";
import MagicString from "magic-string";
import { removeEagernessTransform } from "../../../migrations/v2/transforms/remove-eagerness.ts";
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
  const replacements = removeEagernessTransform(filePath, source, parseResult);
  return applyReplacements(source, replacements);
}

// -----------------------------------------------------------------------
// Behavior 1: Solo eagerness prop — entire first arg removed
// -----------------------------------------------------------------------
describe("removeEagernessTransform - solo eagerness: removes entire first argument", () => {
  it("removes {eagerness: 'load'} and trailing comma+space when eagerness is only prop", () => {
    const source = `useVisibleTask$({eagerness: 'load'}, async () => { console.log('hi') })`;
    const result = transform(source);
    expect(result).toBe(`useVisibleTask$(async () => { console.log('hi') })`);
  });
});

// -----------------------------------------------------------------------
// Behavior 2: Multi-prop, eagerness first — eagerness prop removed, rest kept
// -----------------------------------------------------------------------
describe("removeEagernessTransform - eagerness first among multiple props", () => {
  it("removes eagerness when it is the first property, preserving remaining props", () => {
    const source = `useVisibleTask$({eagerness: 'load', strategy: 'intersection'}, cb)`;
    const result = transform(source);
    expect(result).toBe(`useVisibleTask$({strategy: 'intersection'}, cb)`);
  });
});

// -----------------------------------------------------------------------
// Behavior 3: Multi-prop, eagerness last — eagerness prop removed, rest kept
// -----------------------------------------------------------------------
describe("removeEagernessTransform - eagerness last among multiple props", () => {
  it("removes eagerness when it is the last property, preserving leading props", () => {
    const source = `useVisibleTask$({strategy: 'intersection', eagerness: 'load'}, cb)`;
    const result = transform(source);
    expect(result).toBe(`useVisibleTask$({strategy: 'intersection'}, cb)`);
  });
});

// -----------------------------------------------------------------------
// Behavior 4: No eagerness prop — not modified, returns empty replacements
// -----------------------------------------------------------------------
describe("removeEagernessTransform - no eagerness prop: file not modified", () => {
  it("returns empty replacements when options object has no eagerness property", () => {
    const source = `useVisibleTask$({strategy: 'intersection'}, cb)`;
    const filePath = "test.ts";
    const parseResult = parseSync(filePath, source, { sourceType: "module" });
    const replacements = removeEagernessTransform(filePath, source, parseResult);
    expect(replacements).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// Behavior 5: Single-arg form (no options object) — not modified
// -----------------------------------------------------------------------
describe("removeEagernessTransform - single-arg form: not modified", () => {
  it("returns empty replacements when useVisibleTask$ has only one argument (callback)", () => {
    const source = `useVisibleTask$(async () => { return 42; })`;
    const filePath = "test.ts";
    const parseResult = parseSync(filePath, source, { sourceType: "module" });
    const replacements = removeEagernessTransform(filePath, source, parseResult);
    expect(replacements).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// Behavior 6: Nested in component$ — deeply nested call is found and transformed
// -----------------------------------------------------------------------
describe("removeEagernessTransform - nested inside component$: deep traversal finds the call", () => {
  it("transforms useVisibleTask$ nested at depth 6+ inside component$ callback", () => {
    const source = `export default component$(() => {
  useVisibleTask$({eagerness: 'load'}, async () => {
    // some async work
  })
})`;
    const result = transform(source);
    expect(result).toContain("useVisibleTask$(async () => {");
    expect(result).not.toContain("eagerness");
    expect(result).not.toContain("{eagerness:");
  });
});

// -----------------------------------------------------------------------
// Behavior 7: Multiple calls in one file — both are transformed
// -----------------------------------------------------------------------
describe("removeEagernessTransform - multiple calls: all eagerness props removed", () => {
  it("transforms two separate useVisibleTask$ calls with eagerness in one file", () => {
    const source = `export const A = component$(() => {
  useVisibleTask$({eagerness: 'load'}, async () => { doA() })
  useVisibleTask$({eagerness: 'visible'}, async () => { doB() })
})`;
    const result = transform(source);
    expect(result).not.toContain("eagerness");
    expect(result).toContain("useVisibleTask$(async () => { doA() })");
    expect(result).toContain("useVisibleTask$(async () => { doB() })");
  });
});
