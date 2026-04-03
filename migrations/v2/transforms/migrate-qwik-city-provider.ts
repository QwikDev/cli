import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Node } from "oxc-parser";
import type { ParseResult } from "oxc-parser";
import type { SourceReplacement, TransformFn } from "../types.ts";
import { walkNode } from "./walk.ts";

// ---------------------------------------------------------------------------
// Type helpers for oxc-parser AST nodes used in this transform
// ---------------------------------------------------------------------------

interface JSXIdentifier {
  type: "JSXIdentifier";
  name: string;
  start: number;
  end: number;
}

interface JSXOpeningElement {
  type: "JSXOpeningElement";
  name: JSXIdentifier;
  selfClosing: boolean;
  start: number;
  end: number;
}

interface JSXClosingElement {
  type: "JSXClosingElement";
  name: JSXIdentifier;
  start: number;
  end: number;
}

interface JSXElement {
  type: "JSXElement";
  openingElement: JSXOpeningElement;
  closingElement: JSXClosingElement | null;
  children: Node[];
  start: number;
  end: number;
}

interface BlockStatement {
  type: "BlockStatement";
  body: Array<{ start: number; end: number; type: string }>;
  start: number;
  end: number;
}

interface FunctionLike {
  type: "ArrowFunctionExpression" | "FunctionExpression" | "FunctionDeclaration";
  body: BlockStatement | Node;
  start: number;
  end: number;
}

interface ImportSpecifier {
  type: "ImportSpecifier";
  imported: { name: string; start: number; end: number };
  local: { name: string; start: number; end: number };
  start: number;
  end: number;
}

interface ImportDeclaration {
  type: "ImportDeclaration";
  source: { value: string };
  specifiers: ImportSpecifier[];
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Astro project detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the project at `rootDir` is a Qwik Router project —
 * detected by the presence of `@builder.io/qwik-city` in any dependency field.
 * Returns false on missing or invalid package.json.
 *
 * Exported for direct unit testing.
 */
export function detectQwikRouterProject(rootDir: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8")) as Record<
      string,
      unknown
    >;
    const allDeps = {
      ...((pkg["dependencies"] as Record<string, string> | undefined) ?? {}),
      ...((pkg["devDependencies"] as Record<string, string> | undefined) ?? {}),
      ...((pkg["peerDependencies"] as Record<string, string> | undefined) ?? {}),
    };
    return "@builder.io/qwik-city" in allDeps;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core transform logic (exported for direct testing without rootDir detection)
// ---------------------------------------------------------------------------

/**
 * The internal transform function that removes `<QwikCityProvider>` wrapper tags,
 * injects `const router = useQwikRouter();` into the enclosing function body,
 * and mutates the import specifier.
 *
 * Exported for direct unit testing. Use `makeQwikCityProviderTransform` for
 * production use (includes Astro project detection via rootDir).
 */
export const qwikCityProviderTransform: TransformFn = (
  _filePath: string,
  source: string,
  parseResult: ParseResult,
): SourceReplacement[] => {
  const replacements: SourceReplacement[] = [];
  const program = parseResult.program as unknown as Node;

  // -----------------------------------------------------------------------
  // Step 1: Find all QwikCityProvider JSXElement nodes
  // -----------------------------------------------------------------------
  const qcpElements: JSXElement[] = [];

  walkNode(program, (node: Node) => {
    if (node.type !== "JSXElement") return;
    const el = node as unknown as JSXElement;
    if (el.openingElement?.name?.name === "QwikCityProvider") {
      qcpElements.push(el);
    }
  });

  if (qcpElements.length === 0) return [];

  // If multiple found, warn and process only the outermost (largest range).
  // This guards against collision in applyTransforms.
  const el =
    qcpElements.length === 1
      ? qcpElements[0]!
      : qcpElements.reduce((best, cur) =>
          cur.end - cur.start > best.end - best.start ? cur : best,
        );

  // -----------------------------------------------------------------------
  // Step 2: Remove opening tag
  // -----------------------------------------------------------------------
  replacements.push({
    start: el.openingElement.start,
    end: el.openingElement.end,
    replacement: "",
  });

  // -----------------------------------------------------------------------
  // Step 3: Remove closing tag (guard against self-closing)
  // -----------------------------------------------------------------------
  if (el.closingElement) {
    replacements.push({
      start: el.closingElement.start,
      end: el.closingElement.end,
      replacement: "",
    });
  }

  // -----------------------------------------------------------------------
  // Step 4: Inject hook at top of enclosing function body
  // -----------------------------------------------------------------------
  const functionTypes = new Set([
    "ArrowFunctionExpression",
    "FunctionExpression",
    "FunctionDeclaration",
  ]);

  const allFns: FunctionLike[] = [];
  walkNode(program, (node: Node) => {
    if (functionTypes.has(node.type)) {
      const fn = node as unknown as FunctionLike;
      if (fn.body && fn.body.type === "BlockStatement") {
        allFns.push(fn);
      }
    }
  });

  // Find the smallest enclosing function that contains the QwikCityProvider element
  const enclosingFn = allFns
    .filter((fn) => fn.start <= el.start && el.end <= fn.end)
    .reduce<FunctionLike | null>((best, cur) => {
      if (!best) return cur;
      // Prefer smallest (most immediate) enclosing function
      return cur.end - cur.start < best.end - best.start ? cur : best;
    }, null);

  if (enclosingFn) {
    const block = enclosingFn.body as BlockStatement;
    if (block.body.length > 0) {
      const firstStmt = block.body[0]!;
      const firstStmtStart = firstStmt.start;
      replacements.push({
        start: firstStmtStart,
        end: firstStmtStart + 1,
        replacement: `const router = useQwikRouter();\n  ${source[firstStmtStart]}`,
      });
    }
  } else {
    console.warn(
      `[migrate-qwik-city-provider] No enclosing function found for QwikCityProvider — skipping hook injection`,
    );
  }

  // -----------------------------------------------------------------------
  // Step 5: Mutate the import specifier
  // At Step 2b time, the import source is still @builder.io/qwik-city
  // (Step 3 package replacement has not run yet). QwikCityProvider is NOT
  // renamed by Step 2's import rename rounds — this transform handles it.
  // -----------------------------------------------------------------------
  const bodyNodes = (program as unknown as { body: Node[] }).body;

  const importDecl = bodyNodes.find(
    (stmt) =>
      stmt.type === "ImportDeclaration" &&
      (stmt as unknown as ImportDeclaration).source.value === "@builder.io/qwik-city",
  ) as ImportDeclaration | undefined;

  if (!importDecl) return replacements;

  const specs = importDecl.specifiers;
  const qcpSpecIdx = specs.findIndex(
    (s) => s.type === "ImportSpecifier" && s.imported.name === "QwikCityProvider",
  );

  if (qcpSpecIdx === -1) return replacements;

  const qcpSpec = specs[qcpSpecIdx]!;
  const hasUseQwikRouter = specs.some(
    (s) => s.type === "ImportSpecifier" && s.imported.name === "useQwikRouter",
  );

  if (!hasUseQwikRouter) {
    // Rename: replace QwikCityProvider specifier with useQwikRouter
    replacements.push({
      start: qcpSpec.start,
      end: qcpSpec.end,
      replacement: "useQwikRouter",
    });
  } else {
    // Remove: QwikCityProvider specifier (useQwikRouter already present)
    if (specs.length === 1) {
      // Only specifier — remove entire ImportDeclaration
      replacements.push({
        start: importDecl.start,
        end: importDecl.end,
        replacement: "",
      });
    } else if (qcpSpecIdx < specs.length - 1) {
      // Not last: remove from qcpSpec.start to nextSpec.start (removes "QwikCityProvider, ")
      const nextSpec = specs[qcpSpecIdx + 1]!;
      replacements.push({
        start: qcpSpec.start,
        end: nextSpec.start,
        replacement: "",
      });
    } else {
      // Last specifier: remove from prevSpec.end to qcpSpec.end (removes ", QwikCityProvider")
      const prevSpec = specs[qcpSpecIdx - 1]!;
      replacements.push({
        start: prevSpec.end,
        end: qcpSpec.end,
        replacement: "",
      });
    }
  }

  return replacements;
};

// ---------------------------------------------------------------------------
// Factory function (production use — includes Astro project detection)
// ---------------------------------------------------------------------------

/**
 * Factory that creates a `TransformFn` configured for the given project root.
 *
 * The returned `TransformFn`:
 * - Detects whether the project is a Qwik Router app by reading `rootDir/package.json`
 *   once at factory call time (not per-file)
 * - Returns `[]` for Astro projects (no `@builder.io/qwik-city` in package.json)
 * - Otherwise delegates to `qwikCityProviderTransform` for the full rewrite
 *
 * @param rootDir - Absolute path to the project root (must contain package.json)
 * @returns A `TransformFn` compatible with `applyTransforms`
 */
export function makeQwikCityProviderTransform(rootDir: string): TransformFn {
  // Detect once at factory call time — not on every file
  const isQwikRouterProject = detectQwikRouterProject(rootDir);

  return (filePath: string, source: string, parseResult: ParseResult): SourceReplacement[] => {
    if (!isQwikRouterProject) {
      console.warn(
        `[migrate-qwik-city-provider] Skipping ${filePath} — @builder.io/qwik-city not found in package.json (Astro project?)`,
      );
      return [];
    }
    return qwikCityProviderTransform(filePath, source, parseResult);
  };
}
