# Architecture Research

**Domain:** Multi-command CLI tool (9-command Qwik CLI + create-qwik scaffolder)
**Researched:** 2026-04-02
**Confidence:** HIGH — All integration points verified against actual source files in /src/, /stubs/, /bin/, and /adapters/; create-qwik reference read from /packages/create-qwik/

---

## Integration Analysis: New Features vs Existing Architecture

This document answers four specific integration questions for the v1.1 milestone, with reference to the current codebase at each decision point.

---

## Question 1: Where Does starters/ Go and How Does It Relate to stubs/?

### Current Reality

The existing `stubs/` directory already has the correct four-category structure the Qwik repo uses for starters:

```
stubs/
├── adapters/cloudflare-pages/    ← only 1 adapter (placeholder)
├── features/                     ← empty
├── apps/qwik/                    ← placeholder app
└── templates/qwik/               ← component/route/markdown/mdx (working)
```

The "top-level `adapters/` folder" referenced in PROJECT.md is a separate `adapters/` directory at the repo root — this is not the same as `stubs/adapters/`. The root-level `adapters/` is the one to remove.

The existing `loadIntegrations()` in `src/integrations/load-integrations.ts` already reads from `stubs/adapters/` and `stubs/features/`. The existing `loadTemplates()` in `src/commands/new/templates.ts` already reads from `stubs/templates/`.

**There is no `starters/` folder to add.** The Qwik repo organizes its content as `starters/` (with `apps/`, `adapters/`, `features/` inside), but this repo uses `stubs/` as the equivalent root. The v1.1 work is to populate the _existing_ `stubs/` subdirectories with real content from the Qwik repo's starters, not to introduce a new top-level folder.

### Integration Decision

Populate these existing `stubs/` subdirectories with real content copied from the Qwik monorepo:

| Qwik Repo Source | This Repo Destination | Consumer |
|------------------|-----------------------|----------|
| `packages/qwik/dist/starters/adapters/` (14 adapters) | `stubs/adapters/` | `loadIntegrations()` → `add` command |
| `packages/qwik/dist/starters/features/` (22+ features) | `stubs/features/` | `loadIntegrations()` → `add` command |
| `packages/create-qwik/dist/starters/apps/` (base, empty, library, playground) | `stubs/apps/` | `create-qwik` command (new) |

The path resolution logic in `load-integrations.ts` already handles the `stubs/adapters/` and `stubs/features/` discovery. The `stubs/apps/` path will need to be added as a new consumer (see Question 3).

### Removal

Delete `adapters/cloudflare-pages/` at the repo root. This is the incorrect top-level directory that shouldn't exist. The correct location is `stubs/adapters/cloudflare-pages/`.

### Updated stubs/ Layout

```
stubs/
├── adapters/         ← 14 real adapters from Qwik repo (cloudflare-pages, vercel-edge, netlify-edge, etc.)
├── features/         ← 22+ real features from Qwik repo (tailwind, auth, drizzle, etc.)
├── apps/             ← 4 starter apps from create-qwik (base, empty, library, playground)
└── templates/        ← unchanged (component/route/markdown/mdx for qwik new)
    └── qwik/
```

---

## Question 2: How to Restructure src/migrate/ into migrations/v2/?

### Current Reality

The current structure is a flat `src/migrate/` directory:

```
src/migrate/
├── binary-extensions.ts    ← static list of binary file extensions
├── rename-import.ts        ← AST import rename via oxc-parser + magic-string
├── replace-package.ts      ← regex-based text replacement (5 ordered calls)
├── run-migration.ts        ← orchestrator: 5-step v1→v2 flow
├── update-dependencies.ts  ← npm dist-tag lookup + dependency update
├── versions.ts             ← resolveV2Versions(), PACKAGE_NAMES
└── visit-not-ignored.ts    ← .gitignore-aware file traversal
```

The `src/commands/migrate/index.ts` imports directly from `../../migrate/run-migration.js`.

### Target Structure

The goal is `migrations/v2/` scoped folders (version-chained). The migration utilities are version-specific — the v2 migration utilities should live alongside the v2 migration definition, not in a generic `src/migrate/` folder.

**New structure:**

```
migrations/
└── v2/
    ├── index.ts                  ← renamed from run-migration.ts (exports runV2Migration)
    ├── rename-import.ts          ← moved from src/migrate/
    ├── replace-package.ts        ← moved from src/migrate/
    ├── update-dependencies.ts    ← moved from src/migrate/
    ├── versions.ts               ← moved from src/migrate/
    ├── visit-not-ignored.ts      ← moved from src/migrate/
    └── binary-extensions.ts     ← moved from src/migrate/
```

The `src/migrate/` directory is deleted after migration.

### Keeping Existing Code Working During the Move

The command module (`src/commands/migrate/index.ts`) currently imports:

```typescript
import { runV2Migration } from "../../migrate/run-migration.js";
```

After the move, this becomes:

```typescript
import { runV2Migration } from "../../../migrations/v2/index.js";
```

The function signature `runV2Migration(rootDir: string): Promise<void>` does not change. The command module's behavior is identical — only the import path changes.

### Migration Chain Design

The `migrations/` folder at the repo root (not inside `src/`) supports version-chaining. When a v3 migration is needed, the structure becomes:

```
migrations/
├── v2/   ← current
└── v3/   ← future (independent set of utilities)
```

The `upgrade --migrate` command (when built) would discover available migration folders by reading `migrations/` and chain them in version order. Each version folder exports a `run{V}Migration(rootDir)` function with the same signature.

### tsdown Build Config

The `migrations/` directory lives outside `src/` and outside the existing `entry` array. The tsdown config currently bundles `src/index.ts`, `src/router.ts`, and `bin/qwik.ts`. The migration modules are imported transitively through `src/commands/migrate/index.ts`, which is imported by `src/router.ts`. No explicit entry changes are needed — the migration code is bundled as part of the existing graph.

### What Does Not Change

- The `src/commands/migrate/index.ts` command file stays in `src/commands/migrate/` — it is the command, not the migration utilities
- The `MigrateProgram` class, `runCli()` router entry, and all test references to `migrate-v2` remain identical
- The `run-migration.ts` → `migrations/v2/index.ts` rename only affects the export; the function name `runV2Migration` is unchanged

---

## Question 3: Where Does create-qwik Entry Point Go?

### Current Reality

The `bin/` directory currently has:

```
bin/
├── qwik.ts     ← entry for @qwik.dev/cli binary
└── test.ts     ← test runner entry
```

The `package.json` only declares one binary:

```json
"bin": {
  "qwik": "./dist/bin/qwik.mjs"
}
```

### Target Structure

Add `bin/create-qwik.ts` as the shebang entry for the `create-qwik` binary:

```
bin/
├── qwik.ts           ← unchanged
├── create-qwik.ts    ← NEW: entry for create-qwik binary
└── test.ts           ← unchanged
```

The `bin/create-qwik.ts` file should follow the exact same pattern as `bin/qwik.ts` — thin shebang entry, one import, one call:

```typescript
#!/usr/bin/env node
import { runCreateCli } from "../src/create-qwik/index.js";

runCreateCli();
```

### package.json Changes

Two additions are needed:

**1. Add the second binary:**
```json
"bin": {
  "qwik": "./dist/bin/qwik.mjs",
  "create-qwik": "./dist/bin/create-qwik.mjs"
}
```

**2. Add the entry to tsdown config:**
```typescript
entry: ['src/index.ts', 'src/router.ts', 'bin/qwik.ts', 'bin/create-qwik.ts'],
```

### create-qwik Command Implementation

The create-qwik logic lives in a new `src/create-qwik/` directory (separate from `src/commands/` because it is a distinct binary, not a subcommand):

```
src/create-qwik/
├── index.ts              ← runCreateCli() — exported; called from bin/create-qwik.ts
├── create-app.ts         ← createApp() — scaffolds from a starter app
├── template-manager.ts   ← loadApps() — reads stubs/apps/ (new; parallel to loadIntegrations)
└── helpers/
    ├── resolve-dir.ts    ← resolveRelativeDir()
    ├── install-deps.ts   ← installDepsCli() wrapper
    └── log-created.ts    ← logAppCreated() output
```

The `template-manager.ts` reads from `stubs/apps/` using the same `__dirname`-relative resolution pattern already established in `load-integrations.ts`. The apps in `stubs/apps/` follow the same `package.json + __qwik__` structure used by adapters and features.

### Reference Implementation Coupling

The reference `create-qwik` source (`/packages/create-qwik/src/`) imports directly from `packages/qwik/src/cli/` (the monorepo path). These cross-package imports must not be brought over — all of them map to existing code in this repo:

| Reference import | Maps to in this repo |
|------------------|----------------------|
| `../../qwik/src/cli/utils/utils` (panic, printHeader, getPackageManager) | `src/console.ts` + `src/utils/` |
| `../../qwik/src/cli/utils/install-deps` | New `src/create-qwik/helpers/install-deps.ts` or reuse `integrations/update-app.ts` |
| `packages/qwik/src/cli/types` (IntegrationData, CreateAppResult) | `src/types.ts` (already has both) |
| `../../qwik/src/cli/add/update-app` | `src/integrations/update-app.ts` |

The reference's `runCreateInteractiveCli()` includes a background install optimization (start installing `base` app deps immediately while prompts are shown). This pattern is optional for v1.1 — it can be deferred until create-qwik correctness is verified.

---

## Question 4: How Does oxfmt/oxlint Config Replace biome.json?

### Current Reality

`biome.json` at the repo root:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.10/schema.json",
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "files": { "includes": ["src/**/*.ts", "tests/**/*.ts", "bin/**/*.ts"] }
}
```

Current `package.json` scripts:

```json
"lint": "biome check .",
"format": "biome format --write ."
```

Current dev dependency: `"@biomejs/biome": "^2.0.0"`

### Replacement Plan

**Files to add:**

`.oxlintrc.json` (oxlint configuration, ESLint v8-compatible format):
```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "plugins": ["typescript"],
  "rules": {
    "no-unused-vars": "error",
    "no-console": "off"
  },
  "ignorePatterns": ["dist/**", "node_modules/**"]
}
```

`.oxfmtrc.json` (oxfmt formatter configuration, Prettier-compatible format):
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all"
}
```

The current `biome.json` sets `indentWidth: 2` and `indentStyle: space` — these map directly to `tabWidth: 2` and `useTabs: false` in oxfmt. No formatting changes to existing code are expected.

**package.json changes:**

```json
"scripts": {
  "build": "tsdown",
  "test": "node --import tsx/esm bin/test.ts",
  "lint": "oxlint src/ tests/ bin/",
  "format": "oxfmt src/ tests/ bin/"
},
"devDependencies": {
  "oxlint": "^1.0.0",
  "oxfmt": "latest",
  ...
}
```

Remove `"@biomejs/biome"` from devDependencies.

**Files to remove:** `biome.json`

### Scope Note on oxfmt Status

oxfmt was in Alpha (December 2025) and entered Beta (February 2026). The npm package `oxfmt` exists and is installable. As of April 2026 it is pre-1.0 but actively maintained and production-usable for TypeScript projects. The configuration file is `.oxfmtrc.json` (Prettier-compatible key names). If oxfmt proves unstable during implementation, Prettier itself is a drop-in fallback since oxfmt uses Prettier's exact configuration format.

---

## Component Boundaries: New vs Modified

| Component | Status | Change |
|-----------|--------|--------|
| `stubs/adapters/` | Modified | Populated with 14 real adapters from Qwik repo |
| `stubs/features/` | Modified | Populated with 22+ real features from Qwik repo |
| `stubs/apps/` | New content | Populated with base/empty/library/playground from create-qwik |
| `adapters/` (root-level) | Deleted | Remove incorrect top-level directory |
| `migrations/v2/` | New location | `src/migrate/` files moved here; function signatures unchanged |
| `src/migrate/` | Deleted | After move to `migrations/v2/` |
| `src/commands/migrate/index.ts` | Modified | Import path update only: `../../migrate/run-migration.js` → `../../../migrations/v2/index.js` |
| `bin/create-qwik.ts` | New | Shebang entry for create-qwik binary |
| `src/create-qwik/` | New | Full create-qwik Program implementation |
| `src/commands/joke/jokes.ts` | Modified | Replace 10 hardcoded jokes with real `jokes.json` from Qwik repo (50+ jokes) |
| `biome.json` | Deleted | Replaced by `.oxlintrc.json` and `.oxfmtrc.json` |
| `.oxlintrc.json` | New | oxlint configuration |
| `.oxfmtrc.json` | New | oxfmt formatter configuration |
| `package.json` | Modified | Add `create-qwik` to `bin`, add `oxlint`/`oxfmt`, remove `@biomejs/biome`, update lint/format scripts |
| `tsdown.config.ts` | Modified | Add `bin/create-qwik.ts` to entry array |

---

## Data Flow: New Components

### create-qwik (interactive)

```
bin/create-qwik.ts → runCreateCli()
    ↓
src/create-qwik/index.ts: CreateQwikProgram.run(process.argv)
    ↓
parse: yargs (template positional, outDir positional, --force, --installDeps)
    ↓
interact():
  → text prompt: project directory
  → loadApps() from stubs/apps/       ← reads stubs/apps/ via template-manager.ts
  → select prompt: starter app
  → confirm: install deps?
  → confirm: git init?
    ↓
execute(input):
  → createApp({ appId, outDir, pkgManager })
      → updateApp({ applyViteConfig: false })   ← reuses existing update-app
  → git init (if requested)
  → installDeps(pkgManager, outDir)
  → logAppCreated()
```

### migrations/v2/ (unchanged behavior, new location)

```
src/commands/migrate/index.ts:MigrateProgram.execute()
    ↓
import { runV2Migration } from "../../../migrations/v2/index.js"
    ↓
migrations/v2/index.ts:runV2Migration(rootDir)
    ↓ (5-step sequence unchanged)
rename-import.ts → replace-package.ts → update-dependencies.ts
```

---

## Build Order for v1.1 Features

Dependencies between new features determine which order to implement them:

```
1. CLEANUP (no deps)
   - Delete adapters/ (root-level)
   - Delete src/migrate/ after completing step 3

2. CONTENT (no code changes needed)
   - Populate stubs/adapters/ from Qwik repo
   - Populate stubs/features/ from Qwik repo
   - Populate stubs/apps/ from create-qwik (needed by step 4)
   - Replace jokes.ts with real jokes.json

3. MIGRATION RESTRUCTURE (depends on: nothing outside migrate/)
   - Create migrations/v2/
   - Move src/migrate/* to migrations/v2/
   - Rename run-migration.ts → migrations/v2/index.ts
   - Update src/commands/migrate/index.ts import path
   - Verify tests pass (MigrateProgram behavior unchanged)

4. CREATE-QWIK (depends on: stubs/apps/ populated)
   - Add src/create-qwik/ with Program implementation
   - Add bin/create-qwik.ts
   - Update package.json bin + tsdown entry
   - Add template-manager for stubs/apps/ loading

5. TOOLING (independent of all above)
   - Remove @biomejs/biome devDependency
   - Add oxlint + oxfmt devDependencies
   - Delete biome.json
   - Add .oxlintrc.json and .oxfmtrc.json
   - Update package.json lint/format scripts
   - Run formatter to verify no unexpected changes

6. TYPE ERRORS (done last, after all code is in place)
   - Fix any type errors introduced by new components
   - Fix pre-existing type errors in existing src/
```

Steps 2, 3, and 5 have no dependencies on each other and can be done in any order. Step 4 (create-qwik) depends on step 2 (stubs/apps/ populated) but not on step 3 or 5.

---

## Anti-Patterns to Avoid in New Features

### Anti-Pattern 1: Creating a Top-Level starters/ Folder

**What people do:** Follow the Qwik monorepo naming and create a `starters/` directory at the repo root.

**Why it's wrong:** The existing `stubs/` directory already has the correct internal structure. Adding `starters/` creates a duplicate, and `load-integrations.ts` already resolves to `stubs/` by convention established in v1.0.

**Do this instead:** Populate the existing `stubs/adapters/`, `stubs/features/`, and `stubs/apps/` subdirectories.

### Anti-Pattern 2: Importing Monorepo Paths in create-qwik

**What people do:** Copy the reference `create-qwik/src/` files directly, including their `../../qwik/src/cli/` import paths.

**Why it's wrong:** Those paths don't exist in this standalone repo. The reference implementation is coupled to the Qwik monorepo by design. This repo is a standalone extraction.

**Do this instead:** Map each monorepo import to its equivalent in this repo (see mapping table in Question 3). The function signatures and behavior are identical — only import paths change.

### Anti-Pattern 3: Moving migrate/ Inside src/commands/migrate/

**What people do:** Co-locate migration utilities with the migrate command because "the command owns the migration."

**Why it's wrong:** The `migrations/` folder is designed for version chaining — future v3 migrations will live at `migrations/v3/`. Nesting inside `src/commands/migrate/` makes version chaining impossible without restructuring again.

**Do this instead:** `migrations/` at the repo root (parallel to `src/`, `stubs/`, `bin/`). The command imports from `migrations/v2/` as an external module.

### Anti-Pattern 4: Configuring oxfmt Identically to biome.json

**What people do:** Translate every biome.json option to an oxfmt option, including options that change default behavior.

**Why it's wrong:** oxfmt's defaults (printWidth: 100, tabWidth: 2, useTabs: false) already match what biome.json was configured for. Adding explicit options that match defaults creates maintenance noise and a diff when defaults change.

**Do this instead:** Start with an empty `.oxfmtrc.json` and add only options that differ from oxfmt defaults. For this project, the existing 2-space indent is already the default — no config needed for it.

---

## Integration Points Summary

| New Component | Connects To | Via |
|---------------|-------------|-----|
| `stubs/adapters/` (populated) | `src/integrations/load-integrations.ts` | Filesystem; no code change |
| `stubs/features/` (populated) | `src/integrations/load-integrations.ts` | Filesystem; no code change |
| `stubs/apps/` (populated) | `src/create-qwik/template-manager.ts` | New; same resolution pattern as load-integrations |
| `migrations/v2/index.ts` | `src/commands/migrate/index.ts` | Import path update |
| `bin/create-qwik.ts` | `src/create-qwik/index.ts` | Direct import (thin entry) |
| `src/create-qwik/` | `src/integrations/update-app.ts` | Direct import; `applyViteConfig: false` |
| `.oxlintrc.json` | `package.json` lint script | `oxlint src/ tests/ bin/` |
| `.oxfmtrc.json` | `package.json` format script | `oxfmt src/ tests/ bin/` |

---

## Sources

- `/Users/jackshelton/dev/open-source/qwik-cli/src/integrations/load-integrations.ts` — stubs resolution logic verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik-cli/src/commands/new/templates.ts` — stubs/templates/ resolution verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik-cli/src/commands/migrate/index.ts` — current import path verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik-cli/src/migrate/run-migration.ts` — 5-step orchestration verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik-cli/tsdown.config.ts` — entry array verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik-cli/package.json` — bin entry, scripts, deps verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik-cli/biome.json` — current config verified (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik/packages/create-qwik/` — reference implementation read (HIGH confidence, direct read)
- `/Users/jackshelton/dev/open-source/qwik/packages/qwik/dist/starters/` — adapter/feature content verified (HIGH confidence, direct read)
- oxlint config reference: [https://oxc.rs/docs/guide/usage/linter/config-file-reference.html](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html) — MEDIUM confidence (web, official docs)
- oxfmt overview: [https://oxc.rs/docs/guide/usage/formatter](https://oxc.rs/docs/guide/usage/formatter) — MEDIUM confidence (web, official docs)
- oxfmt beta announcement: [https://oxc.rs/blog/2026-02-24-oxfmt-beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta) — MEDIUM confidence (web, official blog)

---
*Architecture research for: @qwik.dev/cli v1.1 feature integration*
*Researched: 2026-04-02*
