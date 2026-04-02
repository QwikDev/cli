import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRegExp, exactly } from "magic-regexp";
import { isBinaryPath } from "./binary-extensions.js";
import { visitNotIgnoredFiles } from "./visit-not-ignored.js";

/**
 * Replace all occurrences of `oldPkg` with `newPkg` in every non-binary,
 * non-ignored file under process.cwd().
 *
 * @param oldPkg - The package name to search for (literal string)
 * @param newPkg - The replacement package name
 * @param exact - Documentation marker only; both paths use the same regex.
 *                Pass `true` for `@qwik-city-plan` → `@qwik-router-config`.
 */
export async function replacePackage(
  oldPkg: string,
  newPkg: string,
  exact?: boolean,
): Promise<void> {
  // exact is a documentation marker — both paths use the same regex
  void exact;
  const regex = createRegExp(exactly(oldPkg), ["g"]);

  await visitNotIgnoredFiles(process.cwd(), (relPath) => {
    if (isBinaryPath(relPath)) return;

    const fullPath = join(process.cwd(), relPath);

    let content: string;
    try {
      content = readFileSync(fullPath, "utf-8");
    } catch {
      return;
    }

    if (content.includes(oldPkg)) {
      const updated = content.replace(regex, newPkg);
      writeFileSync(fullPath, updated, "utf-8");
    }
  });
}

/**
 * Run all 5 package replacements in the correct substring-safe order.
 *
 * CRITICAL ORDER (Pitfall 3): @builder.io/qwik MUST be last because it is a
 * substring of @builder.io/qwik-city and @builder.io/qwik-react. Running it
 * first would corrupt those replacements.
 *
 * The order is:
 * 1. @qwik-city-plan         → @qwik-router-config     (exact, no substring risk)
 * 2. @builder.io/qwik-city   → @qwik.dev/router
 * 3. @builder.io/qwik-react  → @qwik.dev/react
 * 4. @builder.io/qwik/jsx-runtime → @qwik.dev/core     (more specific before generic)
 * 5. @builder.io/qwik        → @qwik.dev/core           (MUST BE LAST)
 */
export async function runAllPackageReplacements(): Promise<void> {
  await replacePackage("@qwik-city-plan", "@qwik-router-config", true);
  await replacePackage("@builder.io/qwik-city", "@qwik.dev/router");
  await replacePackage("@builder.io/qwik-react", "@qwik.dev/react");
  await replacePackage("@builder.io/qwik/jsx-runtime", "@qwik.dev/core");
  await replacePackage("@builder.io/qwik", "@qwik.dev/core"); // MUST BE LAST
}
