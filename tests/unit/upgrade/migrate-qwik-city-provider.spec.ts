import { describe, expect, it } from "vitest";
import { parseSync } from "oxc-parser";
import MagicString from "magic-string";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  qwikCityProviderTransform,
  detectQwikRouterProject,
} from "../../../migrations/v2/transforms/migrate-qwik-city-provider.ts";
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
  const filePath = "root.tsx";
  const parseResult = parseSync(filePath, source, { sourceType: "module" });
  const replacements = qwikCityProviderTransform(filePath, source, parseResult);
  return applyReplacements(source, replacements);
}

// -----------------------------------------------------------------------
// Test 1: Standard rewrite — opening/closing tags removed, children preserved,
//         const router = useQwikRouter() injected, import renamed
// -----------------------------------------------------------------------
describe("qwikCityProviderTransform - standard rewrite: QwikCityProvider -> useQwikRouter()", () => {
  it("removes opening and closing tags, injects hook, renames import specifier", () => {
    const source = `import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { component$ } from "@qwik.dev/core";

export default component$(() => {
  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});`;
    const result = transform(source);

    // Opening and closing QwikCityProvider tags are removed
    expect(result).not.toContain("<QwikCityProvider>");
    expect(result).not.toContain("</QwikCityProvider>");

    // Children are preserved intact
    expect(result).toContain("<head>");
    expect(result).toContain('<meta charset="utf-8" />');
    expect(result).toContain("</head>");
    expect(result).toContain("<body>");
    expect(result).toContain("<RouterOutlet />");
    expect(result).toContain("</body>");

    // Hook injected before return
    expect(result).toContain("const router = useQwikRouter();");
    const hookIdx = result.indexOf("const router = useQwikRouter();");
    const returnIdx = result.indexOf("return (");
    expect(hookIdx).toBeLessThan(returnIdx);

    // Import specifier renamed: QwikCityProvider -> useQwikRouter
    expect(result).toContain("useQwikRouter");
    expect(result).not.toContain("QwikCityProvider");
    // RouterOutlet still present in import
    expect(result).toContain("RouterOutlet");
  });
});

// -----------------------------------------------------------------------
// Test 2: Astro project skip — detectQwikRouterProject returns false
//         when package.json lacks @builder.io/qwik-city
// -----------------------------------------------------------------------
describe("detectQwikRouterProject - Astro project: returns false when @builder.io/qwik-city absent", () => {
  it("returns false when package.json has no @builder.io/qwik-city dependency", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "qwik-test-astro-"));
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "my-astro-project",
        dependencies: {
          astro: "^4.0.0",
          "@astrojs/qwik": "^0.5.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      }),
    );
    const result = detectQwikRouterProject(tmpDir);
    expect(result).toBe(false);
  });

  it("returns true when package.json has @builder.io/qwik-city in dependencies", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "qwik-test-router-"));
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "my-qwik-project",
        dependencies: {
          "@builder.io/qwik-city": "^1.9.0",
          "@builder.io/qwik": "^1.9.0",
        },
      }),
    );
    const result = detectQwikRouterProject(tmpDir);
    expect(result).toBe(true);
  });

  it("returns true when @builder.io/qwik-city is in devDependencies", () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "qwik-test-router-dev-"));
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "my-qwik-project",
        devDependencies: {
          "@builder.io/qwik-city": "^1.9.0",
        },
      }),
    );
    const result = detectQwikRouterProject(tmpDir);
    expect(result).toBe(true);
  });

  it("returns false when package.json does not exist", () => {
    const result = detectQwikRouterProject("/tmp/__non_existent_path_12345__");
    expect(result).toBe(false);
  });
});

// -----------------------------------------------------------------------
// Test 3: Deeply nested children — all preserved intact after transform
// -----------------------------------------------------------------------
describe("qwikCityProviderTransform - nested children: deeply nested elements preserved", () => {
  it("preserves deeply nested JSX children unchanged after QwikCityProvider tag removal", () => {
    const source = `import { QwikCityProvider } from "@builder.io/qwik-city";
import { component$ } from "@qwik.dev/core";

export default component$(() => {
  return (
    <QwikCityProvider>
      <div>
        <span>
          <p>deep</p>
        </span>
      </div>
    </QwikCityProvider>
  );
});`;
    const result = transform(source);

    // Tags removed
    expect(result).not.toContain("<QwikCityProvider>");
    expect(result).not.toContain("</QwikCityProvider>");

    // All nested elements preserved
    expect(result).toContain("<div>");
    expect(result).toContain("</div>");
    expect(result).toContain("<span>");
    expect(result).toContain("</span>");
    expect(result).toContain("<p>deep</p>");
  });
});

// -----------------------------------------------------------------------
// Test 4: useQwikRouter already imported — QwikCityProvider specifier removed
//         (not renamed), no duplicate useQwikRouter in output import
// -----------------------------------------------------------------------
describe("qwikCityProviderTransform - useQwikRouter already imported: QwikCityProvider removed", () => {
  it("removes QwikCityProvider specifier when useQwikRouter is already in the import", () => {
    const source = `import { QwikCityProvider, useQwikRouter, RouterOutlet } from "@builder.io/qwik-city";
import { component$ } from "@qwik.dev/core";

export default component$(() => {
  return (
    <QwikCityProvider>
      <head><meta charset="utf-8" /></head>
      <body><RouterOutlet /></body>
    </QwikCityProvider>
  );
});`;
    const result = transform(source);

    // QwikCityProvider specifier is removed from import
    expect(result).not.toContain("QwikCityProvider");

    // useQwikRouter appears exactly once in the import (no duplicate)
    const importMatch = result.match(
      /import\s*\{([^}]+)\}\s*from\s*["']@builder\.io\/qwik-city["']/,
    );
    expect(importMatch).not.toBeNull();
    const specifiers = importMatch![1]!;
    const useQwikRouterOccurrences = (specifiers.match(/useQwikRouter/g) || []).length;
    expect(useQwikRouterOccurrences).toBe(1);

    // RouterOutlet still present
    expect(result).toContain("RouterOutlet");
  });
});
