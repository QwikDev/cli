import { describe, expect, it } from "vitest";
import { parseSync } from "oxc-parser";
import MagicString from "magic-string";
import { migrateQwikLabsTransform } from "../../../migrations/v2/transforms/migrate-qwik-labs.ts";
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
  const replacements = migrateQwikLabsTransform(filePath, source, parseResult);
  return applyReplacements(source, replacements);
}

// -----------------------------------------------------------------------
// Behavior 1: Known API — rewrites specifier and source
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - known API: rewrites specifier and source", () => {
  it("rewrites usePreventNavigate to usePreventNavigate$ in @qwik.dev/router", () => {
    const source = `import { usePreventNavigate } from "@builder.io/qwik-labs";`;
    const result = transform(source);
    expect(result).toBe(`import { usePreventNavigate$ } from "@qwik.dev/router";`);
  });
});

// -----------------------------------------------------------------------
// Behavior 2: Aliased known API — rewrites imported name, preserves local alias, rewrites source
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - aliased known API: preserves local alias", () => {
  it("rewrites imported name to usePreventNavigate$, preserves alias preventNav, rewrites source", () => {
    const source = `import { usePreventNavigate as preventNav } from "@builder.io/qwik-labs";`;
    const result = transform(source);
    expect(result).toBe(`import { usePreventNavigate$ as preventNav } from "@qwik.dev/router";`);
  });
});

// -----------------------------------------------------------------------
// Behavior 3: Unknown API — inserts TODO comment, leaves source unchanged
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - unknown API: inserts TODO comment, leaves source unchanged", () => {
  it("inserts TODO comment above import and leaves source unchanged for unknown API", () => {
    const source = `import { someUnknownApi } from "@builder.io/qwik-labs";`;
    const result = transform(source);
    expect(result).toContain(
      `// TODO: @builder.io/qwik-labs migration — someUnknownApi has no known v2 equivalent; manual review required`,
    );
    expect(result).toContain(`import { someUnknownApi } from "@builder.io/qwik-labs";`);
    expect(result).not.toContain(`@qwik.dev/router`);
  });
});

// -----------------------------------------------------------------------
// Behavior 4: Mixed known + unknown — renames known specifier, leaves source, adds TODO
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - mixed known+unknown: renames known specifier, leaves source, adds TODO", () => {
  it("renames known specifier but leaves source as @builder.io/qwik-labs and adds TODO for unknown", () => {
    const source = `import { usePreventNavigate, someUnknownApi } from "@builder.io/qwik-labs";`;
    const result = transform(source);
    expect(result).toContain(`usePreventNavigate$`);
    expect(result).toContain(`@builder.io/qwik-labs`);
    expect(result).not.toContain(`@qwik.dev/router`);
    expect(result).toContain(`someUnknownApi has no known v2 equivalent`);
  });
});

// -----------------------------------------------------------------------
// Behavior 5: No qwik-labs import — returns empty replacements (no-op)
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - no qwik-labs import: no-op", () => {
  it("returns empty replacements for file with no @builder.io/qwik-labs import", () => {
    const source = `import { component$ } from "@qwik.dev/core";`;
    const filePath = "test.ts";
    const parseResult = parseSync(filePath, source, { sourceType: "module" });
    const replacements = migrateQwikLabsTransform(filePath, source, parseResult);
    expect(replacements).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------
// Behavior 6: Multiple qwik-labs imports in one file — both are processed
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - multiple qwik-labs imports: all processed", () => {
  it("processes two separate @builder.io/qwik-labs import declarations", () => {
    const source = [
      `import { usePreventNavigate } from "@builder.io/qwik-labs";`,
      `import { someUnknownApi } from "@builder.io/qwik-labs";`,
    ].join("\n");
    const result = transform(source);
    expect(result).toContain(`usePreventNavigate$ } from "@qwik.dev/router"`);
    expect(result).toContain(`someUnknownApi has no known v2 equivalent`);
  });
});

// -----------------------------------------------------------------------
// Behavior 7: Usage renaming — unaliased call sites renamed to usePreventNavigate$()
// -----------------------------------------------------------------------
describe("migrateQwikLabsTransform - usage renaming: call sites renamed for unaliased import", () => {
  it("renames usePreventNavigate() call site to usePreventNavigate$() when import was unaliased", () => {
    const source = [
      `import { usePreventNavigate } from "@builder.io/qwik-labs";`,
      ``,
      `export const MyComponent = component$(() => {`,
      `  const navigate = usePreventNavigate();`,
      `});`,
    ].join("\n");
    const result = transform(source);
    expect(result).toContain(`usePreventNavigate$()`);
    expect(result).not.toContain(`usePreventNavigate()`);
  });
});
