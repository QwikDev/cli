import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock network-dependent steps BEFORE importing runV2Migration.
// vi.mock is hoisted to the top of the file by Vitest automatically.
vi.mock("../../../migrations/v2/versions.ts", () => ({
  resolveV2Versions: vi.fn().mockReturnValue({
    "@qwik.dev/core": "2.0.0",
    "@qwik.dev/router": "2.0.0",
  }),
}));

vi.mock("../../../migrations/v2/update-dependencies.ts", () => ({
  checkTsMorphPreExisting: vi.fn().mockReturnValue(false),
  removeTsMorphFromPackageJson: vi.fn(),
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

import { runV2Migration } from "../../../migrations/v2/index.ts";

// Combined fixture: root.tsx with ALL migratable patterns in a single file.
// CRITICAL: Must use @builder.io/qwik-city (not @qwik.dev/router) because XFRM-04
// runs at Step 2b — before Step 3 text replacements rename the package strings.
const COMBINED_ROOT_TSX = `import { QwikCityProvider } from "@builder.io/qwik-city";
import { component$, useComputed$, useVisibleTask$ } from "@builder.io/qwik";
import { useResource$ } from "@builder.io/qwik";
import { usePreventNavigate } from "@builder.io/qwik-labs";

export default component$(() => {
  const data = useComputed$(async () => await fetch("/api").then(r => r.json()));
  const res = useResource$(async ({ track }) => {
    track(() => data.value);
    return await fetch("/data");
  });
  useVisibleTask$({ eagerness: "load" }, async () => { console.log("loaded"); });
  const navigate = usePreventNavigate();
  return (
    <QwikCityProvider>
      <div>Hello</div>
    </QwikCityProvider>
  );
});
`;

// Already-migrated fixture: uses @qwik.dev/* imports with no old patterns.
const ALREADY_MIGRATED_ROOT_TSX = `import { component$ } from "@qwik.dev/core";
import { RouterOutlet, useQwikRouter } from "@qwik.dev/router";

export default component$(() => {
  const router = useQwikRouter();
  return (
    <div>
      <RouterOutlet />
    </div>
  );
});
`;

// Tests must run sequentially: runV2Migration calls process.chdir() which is a global
// side effect. Running tests in parallel in the same process would corrupt the cwd.
describe.sequential("runV2Migration - pipeline integration: all transforms compose correctly", () => {
  let tmpDir: string;

  beforeEach(() => {
    // realpathSync resolves macOS /var → /private/var symlink so that
    // process.chdir() and relative() produce consistent paths in runV2Migration.
    tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "qwik-pipeline-test-")));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("applies all transforms in correct order on a combined fixture", async () => {
    // Write .gitignore (needed for visitNotIgnoredFiles to work correctly)
    writeFileSync(join(tmpDir, ".gitignore"), "dist/\nnode_modules/\n", "utf-8");

    // Write package.json with @builder.io/qwik-city in dependencies (required for XFRM-04
    // to detect a Qwik Router project and apply QwikCityProvider transform).
    // No "type": "module" here — CONF-03 should add it.
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify(
        {
          name: "test-v1-project",
          dependencies: {
            "@builder.io/qwik-city": "^1.9.0",
            "@builder.io/qwik": "^1.9.0",
          },
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    // Write tsconfig.json with old jsxImportSource and moduleResolution (triggers CONF-01/02)
    writeFileSync(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            jsxImportSource: "@builder.io/qwik",
            moduleResolution: "Node",
          },
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    // Write src/root.tsx with all migratable patterns
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "root.tsx"), COMBINED_ROOT_TSX, "utf-8");

    // Run the full migration pipeline
    await runV2Migration(tmpDir);

    const rootContent = readFileSync(join(tmpDir, "src", "root.tsx"), "utf-8");
    const tsconfigContent = readFileSync(join(tmpDir, "tsconfig.json"), "utf-8");
    const pkgContent = readFileSync(join(tmpDir, "package.json"), "utf-8");

    // --- Import renames (RNME-01/02 via Step 2) ---
    // @builder.io/qwik should be renamed to @qwik.dev/core
    expect(rootContent).toContain("@qwik.dev/core");
    expect(rootContent).not.toContain('"@builder.io/qwik"');
    // @builder.io/qwik-city should be renamed to @qwik.dev/router (via Step 3 text replacement)
    expect(rootContent).toContain("@qwik.dev/router");
    expect(rootContent).not.toContain('"@builder.io/qwik-city"');

    // --- QwikCityProvider structural rewrite (XFRM-04 via Step 2b) ---
    // QwikCityProvider JSX element removed
    expect(rootContent).not.toContain("<QwikCityProvider>");
    expect(rootContent).not.toContain("</QwikCityProvider>");
    // useQwikRouter() hook injected
    expect(rootContent).toContain("useQwikRouter()");

    // --- useVisibleTask$ eagerness removal (XFRM-02 via Step 2b) ---
    expect(rootContent).not.toContain("eagerness");

    // --- useComputed$(async ...) rewritten to useAsync$ (XFRM-01 via Step 2b) ---
    expect(rootContent).toContain("useAsync$");
    expect(rootContent).not.toContain("useComputed$");

    // --- useResource$ rewritten to useAsync$ (XFRM-03 via Step 2b) ---
    // useResource$ call site must be rewritten (TODO comment may contain the string)
    expect(rootContent).not.toContain("= useResource$(");

    // --- @builder.io/qwik-labs migration (ECOS-01 via Step 2b) ---
    // usePreventNavigate should be migrated to usePreventNavigate$ in @qwik.dev/router
    expect(rootContent).not.toContain("@builder.io/qwik-labs");

    // --- Config fixes ---
    // CONF-01: jsxImportSource → @qwik.dev/core
    expect(tsconfigContent).toContain("@qwik.dev/core");
    expect(tsconfigContent).not.toContain("@builder.io/qwik");
    // CONF-02: moduleResolution → Bundler
    expect(tsconfigContent).toContain("Bundler");
    expect(tsconfigContent).not.toContain('"Node"');
    // CONF-03: package.json gets "type": "module"
    expect(pkgContent).toContain('"type": "module"');
  });

  it("does not modify files in an already-migrated project (idempotent)", async () => {
    // Write .gitignore
    writeFileSync(join(tmpDir, ".gitignore"), "dist/\nnode_modules/\n", "utf-8");

    // Already-migrated package.json with no old patterns, already has type: "module"
    writeFileSync(
      join(tmpDir, "package.json"),
      JSON.stringify(
        {
          name: "test-v2-project",
          type: "module",
          dependencies: {
            "@qwik.dev/core": "^2.0.0",
            "@qwik.dev/router": "^2.0.0",
          },
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    // Already-migrated tsconfig.json
    writeFileSync(
      join(tmpDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            jsxImportSource: "@qwik.dev/core",
            moduleResolution: "Bundler",
          },
        },
        null,
        2,
      ) + "\n",
      "utf-8",
    );

    // Write src/root.tsx with already-migrated content
    mkdirSync(join(tmpDir, "src"), { recursive: true });
    writeFileSync(join(tmpDir, "src", "root.tsx"), ALREADY_MIGRATED_ROOT_TSX, "utf-8");

    // Run migration — should be a no-op on already-migrated project
    await runV2Migration(tmpDir);

    const rootContent = readFileSync(join(tmpDir, "src", "root.tsx"), "utf-8");
    const tsconfigContent = readFileSync(join(tmpDir, "tsconfig.json"), "utf-8");
    const pkgContent = readFileSync(join(tmpDir, "package.json"), "utf-8");

    // Already-migrated imports must still use @qwik.dev/* (no regressions)
    expect(rootContent).toContain("@qwik.dev/core");
    expect(rootContent).toContain("@qwik.dev/router");
    expect(rootContent).not.toContain("@builder.io/");

    // Config should remain correct
    expect(tsconfigContent).toContain("@qwik.dev/core");
    expect(tsconfigContent).toContain("Bundler");
    expect(pkgContent).toContain('"type": "module"');

    // No old patterns should appear
    expect(rootContent).not.toContain("QwikCityProvider");
    expect(rootContent).not.toContain("eagerness");
    expect(rootContent).not.toContain("useComputed$");
    expect(rootContent).not.toContain("useResource$");
    expect(rootContent).not.toContain("@builder.io/qwik-labs");
  });
});
