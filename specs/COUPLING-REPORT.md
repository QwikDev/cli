---
title: Starter / Adapter Assets Coupling Report
phase: 08-starter-adapter-assets-coupling-report
plan: 02
verified_branch: build/v2
verified_commit: bfe19e8d9
produced: 2026-04-02
---

# Coupling Report: create-qwik ↔ packages/qwik/src/cli/\*

## Purpose

This document enumerates every coupling point between `packages/create-qwik` and `packages/qwik/src/cli/*`.
A reader must be able to:

1. Identify every import statement that crosses the package boundary.
2. Understand every shared type and helper function.
3. Trace how starter loading depends on core-owned CLI code.
4. Identify every hard-coded path in the asset loading chain.
5. Enumerate the hidden assumptions that would break on extraction.

---

## Source Files Inspected

| File path                                                | Purpose                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/create-qwik/src/helpers/templateManager.ts`    | Loads integrations; wraps `loadIntegrations()` in a typed API for create-qwik                                                  |
| `packages/create-qwik/src/create-app.ts`                 | Core scaffolding: calls `updateApp()`, `cleanPackageJson()`, `writePackageJson()`                                              |
| `packages/create-qwik/src/create-app-facade.ts`          | Public API façade: wraps `createApp()` for external callers                                                                    |
| `packages/create-qwik/src/run-create-cli.ts`             | CLI entry point (non-interactive): parses args, calls `createApp()`, calls `installDeps()`                                     |
| `packages/create-qwik/src/run-create-interactive-cli.ts` | CLI entry point (interactive): full prompt sequence, calls `backgroundInstallDeps()`, `installDeps()`, `runCommand()`          |
| `packages/create-qwik/src/helpers/logAppCreated.ts`      | Success output: calls `logSuccessFooter()`, `note()`                                                                           |
| `packages/create-qwik/src/helpers/jokes.ts`              | Loads jokes from local `./jokes.json` — NO cross-package import                                                                |
| `packages/create-qwik/package.json`                      | Declared dependencies vs. what is actually bundled                                                                             |
| `packages/qwik/src/cli/types.ts`                         | Shared type definitions: `CreateAppOptions`, `CreateAppResult`, `IntegrationData`, `IntegrationType`, and others               |
| `packages/qwik/src/cli/utils/integrations.ts`            | `loadIntegrations()`: reads `starters/` directory relative to `__dirname`                                                      |
| `packages/qwik/src/cli/utils/utils.ts`                   | `getPackageManager()`, `cleanPackageJson()`, `writePackageJson()`, `note()`, `runCommand()`, `wait()`                          |
| `packages/qwik/src/cli/utils/install-deps.ts`            | `installDeps()`, `backgroundInstallDeps()`                                                                                     |
| `packages/qwik/src/cli/utils/log.ts`                     | `logSuccessFooter()`                                                                                                           |
| `packages/qwik/src/cli/add/update-app.ts`                | `updateApp()`: merges integration files; reads `CODE_MOD` global to gate `updateViteConfigs()`                                 |
| `scripts/submodule-cli.ts`                               | Builds `packages/qwik/dist/cli.mjs`; sets `CODE_MOD=true`; copies `starters/features/` and `starters/adapters/`                |
| `scripts/create-qwik-cli.ts`                             | Builds `create-qwik/dist/index.mjs`; sets `CODE_MOD=false`; copies `starters/apps/`; calls `syncBaseStarterVersionsFromQwik()` |

---

## Cross-Package Import Map

Every import statement in `packages/create-qwik/src/**` that targets `packages/qwik/src/cli/*`.

| create-qwik source file             | Imported symbol(s)                                | Imported from (qwik CLI path)              | Import form                               |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| `src/helpers/templateManager.ts`    | `IntegrationData`, `IntegrationType` (type-only)  | `packages/qwik/src/cli/types`              | `import type { ... }`                     |
| `src/helpers/templateManager.ts`    | `loadIntegrations`                                | `packages/qwik/src/cli/utils/integrations` | `import { ... }`                          |
| `src/create-app.ts`                 | `CreateAppResult`, `IntegrationData` (type-only)  | `../../qwik/src/cli/types`                 | `import type { ... }`                     |
| `src/create-app.ts`                 | `cleanPackageJson`, `writePackageJson`            | `../../qwik/src/cli/utils/utils`           | `import { ... }`                          |
| `src/create-app.ts`                 | `updateApp`                                       | `../../qwik/src/cli/add/update-app`        | `import { ... }`                          |
| `src/create-app-facade.ts`          | `CreateAppOptions`, `CreateAppResult` (type-only) | `../../qwik/src/cli/types`                 | `import type { ... }`                     |
| `src/create-app-facade.ts`          | `getPackageManager`                               | `../../qwik/src/cli/utils/utils`           | `import { ... }`                          |
| `src/run-create-cli.ts`             | `CreateAppResult` (type-only)                     | `packages/qwik/src/cli/types`              | `import type { ... }`                     |
| `src/run-create-cli.ts`             | `getPackageManager`                               | `../../qwik/src/cli/utils/utils`           | `import { ... }`                          |
| `src/run-create-cli.ts`             | `installDeps` (aliased as `installDepsFn`)        | `packages/qwik/src/cli/utils/install-deps` | `import { installDeps as installDepsFn }` |
| `src/run-create-interactive-cli.ts` | `backgroundInstallDeps`, `installDeps`            | `../../qwik/src/cli/utils/install-deps`    | `import { ... }`                          |
| `src/run-create-interactive-cli.ts` | `getPackageManager`, `note`, `runCommand`, `wait` | `../../qwik/src/cli/utils/utils`           | `import { ... }`                          |
| `src/run-create-interactive-cli.ts` | `CreateAppResult` (type-only)                     | `../../qwik/src/cli/types`                 | `import type { ... }`                     |
| `src/helpers/logAppCreated.ts`      | `CreateAppResult` (type-only)                     | `../../../qwik/src/cli/types`              | `import type { ... }`                     |
| `src/helpers/logAppCreated.ts`      | `logSuccessFooter`                                | `../../../qwik/src/cli/utils/log`          | `import { ... }`                          |
| `src/helpers/logAppCreated.ts`      | `note`                                            | `../../../qwik/src/cli/utils/utils`        | `import { ... }`                          |

**Total: 16 import statements across 6 source files targeting 5 distinct qwik CLI modules.**

### Import Path Form Inconsistency

Two distinct import path forms are used across create-qwik source files:

- **Monorepo-root-relative alias form:** `'packages/qwik/src/cli/...'`
  Used in: `templateManager.ts`, `run-create-cli.ts`
- **Relative path form:** `'../../qwik/src/cli/...'` or `'../../../qwik/src/cli/...'`
  Used in: `create-app.ts`, `create-app-facade.ts`, `run-create-interactive-cli.ts`, `logAppCreated.ts`

Both forms resolve to the same source files at build time (esbuild and the monorepo tsconfig handle both). The inconsistency implies a tsconfig path alias exists for `packages/qwik/...` but is not enforced uniformly. This makes bulk search-and-replace of the import boundary harder (see extraction blockers below).

---

## Shared Types Catalog

Every type from `packages/qwik/src/cli/types.ts` that create-qwik imports.

| Type               | Used in create-qwik file(s)                                                                                       | Shape / Purpose                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `CreateAppOptions` | `create-app-facade.ts`                                                                                            | `{ starterId: string; outDir: string }` — input to `createAppFacade()`                                                     |
| `CreateAppResult`  | `create-app.ts`, `create-app-facade.ts`, `run-create-cli.ts`, `run-create-interactive-cli.ts`, `logAppCreated.ts` | `{ starterId, outDir, pkgManager, docs: string[] }` — return type of `createApp()`                                         |
| `IntegrationData`  | `create-app.ts`, `templateManager.ts`                                                                             | `{ id, type, name, pkgJson, dir, target?, priority, docs, viteConfig?, alwaysInRoot? }` — shape of each loaded integration |
| `IntegrationType`  | `templateManager.ts`                                                                                              | `'app' \| 'feature' \| 'adapter'` — used to filter integrations in `makeTemplateManager('app')`                            |

Types defined in `types.ts` but NOT imported by create-qwik:
`UpdateAppOptions`, `UpdateAppResult`, `FsUpdates`, `Feature`, `FeatureCmd`, `NextSteps`,
`IntegrationPackageJson`, `QwikIntegrationConfig`, `ViteConfigUpdates`, `EnsureImport`,
`Template`, `TemplateSet`

---

## Shared Helpers Catalog

Every function imported from `packages/qwik/src/cli/utils/*` by create-qwik.

| Function                  | Source module           | Used in create-qwik file(s)                                                  | Behavior                                                                                                                                           |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadIntegrations()`      | `utils/integrations.ts` | `templateManager.ts`                                                         | Reads `join(__dirname, 'starters')` directory; caches result in module-level `integrations` variable                                               |
| `updateApp()`             | `add/update-app.ts`     | `create-app.ts`                                                              | Merges integration file tree into `rootDir`; reads `(globalThis as any).CODE_MOD` to gate `updateViteConfigs()`                                    |
| `cleanPackageJson()`      | `utils/utils.ts`        | `create-app.ts`                                                              | Strips non-allowlisted keys from a package.json object; enforces canonical key ordering                                                            |
| `writePackageJson()`      | `utils/utils.ts`        | `create-app.ts`                                                              | Serializes package.json with 2-space indent + trailing newline                                                                                     |
| `getPackageManager()`     | `utils/utils.ts`        | `create-app-facade.ts`, `run-create-cli.ts`, `run-create-interactive-cli.ts` | Calls `detectPackageManager()?.name \|\| 'pnpm'`                                                                                                   |
| `note()`                  | `utils/utils.ts`        | `run-create-interactive-cli.ts`, `logAppCreated.ts`                          | Renders a clack-style bordered note box to stdout                                                                                                  |
| `runCommand()`            | `utils/utils.ts`        | `run-create-interactive-cli.ts`                                              | Spawns a process via `execa`; returns `{ install: Promise<boolean>, abort }` — used for `git init` sequence                                        |
| `wait()`                  | `utils/utils.ts`        | `run-create-interactive-cli.ts`                                              | `Promise<void>` delay; used for a 500ms pause before the first prompt                                                                              |
| `backgroundInstallDeps()` | `utils/install-deps.ts` | `run-create-interactive-cli.ts`                                              | Starts `pkgManager install` in a sibling temp directory; returns `{ abort, complete, success }`                                                    |
| `installDeps()`           | `utils/install-deps.ts` | `run-create-interactive-cli.ts`, `run-create-cli.ts`                         | Foreground package install via `runCommand(pkgManager, ['install'], dir)`                                                                          |
| `logSuccessFooter()`      | `utils/log.ts`          | `logAppCreated.ts`                                                           | Renders docs links and community links; **returns a string** — caller uses `outString.push(logSuccessFooter(...))` so the return value IS consumed |

---

## Starter Loading Coupling

### The loadIntegrations() \_\_dirname Coupling

`loadIntegrations()` is defined in `packages/qwik/src/cli/utils/integrations.ts` and is the sole discovery mechanism for integrations in both the qwik CLI and create-qwik.

```ts
// packages/qwik/src/cli/utils/integrations.ts — line 7
const __dirname = dirname(fileURLToPath(import.meta.url));

// line 37
const integrationsDir = join(__dirname, "starters");
```

The path `join(__dirname, 'starters')` is evaluated relative to **the bundle file containing the inlined code**, not the original source file. This produces different results in each bundle:

| Bundle                                     | `import.meta.url` resolves to              | `__dirname`                         | `starters/` path                             | Directory exists?                                                      |
| ------------------------------------------ | ------------------------------------------ | ----------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/qwik/dist/cli.mjs` (qwik CLI)    | `packages/qwik/dist/cli.mjs`               | `packages/qwik/dist/`               | `packages/qwik/dist/starters/`               | Yes — `features/` and `adapters/` copied by `scripts/submodule-cli.ts` |
| `create-qwik/dist/index.mjs` (create-qwik) | `create-qwik/dist/index.mjs`               | `create-qwik/dist/`                 | `create-qwik/dist/starters/`                 | Yes — `apps/` copied by `scripts/create-qwik-cli.ts`                   |
| Hypothetical: `@qwik.dev/core` ESM import  | `node_modules/@qwik.dev/core/dist/cli.mjs` | `node_modules/@qwik.dev/core/dist/` | `node_modules/@qwik.dev/core/dist/starters/` | **No** — `apps/` is never shipped in `@qwik.dev/core`                  |

**Mechanism:** esbuild `bundle: true` inlines the code from `integrations.ts` directly into each output file. There is no `import` of `@qwik.dev/core` at runtime — the code is physically copied. This is why `import.meta.url` reflects the bundle's location.

### updateApp() Coupling

`create-app.ts` calls `updateApp()` (from `packages/qwik/src/cli/add/update-app.ts`) with `installDeps: false`. Inside `updateApp()`:

```ts
// packages/qwik/src/cli/add/update-app.ts — line 40
if ((globalThis as any).CODE_MOD) {
  await updateViteConfigs(fileUpdates, integration, opts.rootDir);
}
```

The `CODE_MOD` global is injected at build time by esbuild's `define` option:

| Bundle                       | `CODE_MOD` value | Effect                                                                        |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `packages/qwik/dist/cli.mjs` | `true`           | `updateViteConfigs()` runs — rewrites vite.config files for existing projects |
| `create-qwik/dist/index.mjs` | `false`          | `updateViteConfigs()` is skipped — new project scaffolding only copies files  |

**Source:**

- `scripts/submodule-cli.ts` line 45: `'globalThis.CODE_MOD': 'true'`
- `scripts/create-qwik-cli.ts` line 64: `'globalThis.CODE_MOD': 'false'`

---

## Hard-Coded vs Data-Driven Paths

| Path                                                            | Type                                                       | Location                                                                                    | Risk if changed                                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `join(__dirname, 'starters')`                                   | Hard-coded relative to bundle `__dirname`                  | `integrations.ts:37`                                                                        | Central: if `starters/` moves, ALL integration loading breaks for that bundle                             |
| `starters/apps/`                                                | Hard-coded directory name                                  | `scripts/create-qwik-cli.ts:copyStartersDir(..., ['apps'])`                                 | Build breaks if `apps/` is renamed                                                                        |
| `starters/features/`, `starters/adapters/`                      | Hard-coded directory names                                 | `scripts/submodule-cli.ts:copyStartersDir(..., ['features', 'adapters'])`                   | Build breaks if those directories are renamed                                                             |
| `starters/apps/base/`                                           | Hard-coded via `BASE_ID = 'base'` constant                 | `templateManager.ts`                                                                        | `getBaseApp()` fails silently or throws `AppNotFoundError` if the `base/` directory is renamed            |
| `starters/apps/library/`                                        | Hard-coded via `LIBRARY_ID = 'library'` constant           | `templateManager.ts`                                                                        | Library bootstrapping path fails if `library/` directory is renamed                                       |
| `distCliDir/starters/apps/base/package.json`                    | Hard-coded path in build                                   | `scripts/create-qwik-cli.ts:syncBaseStarterVersionsFromQwik()` (via `updateBaseVersions()`) | Version sync silently fails if `base/` directory moves                                                    |
| `integrationsDirName.slice(0, -1)` (strips trailing `s`)        | Convention: directory names must end in `s`                | `integrations.ts:42`                                                                        | Any new type directory not ending in `s` (e.g., `scaffold/`) is silently ignored                          |
| `integrationTypes.includes(integrationType)` check              | Data-driven from `['app', 'feature', 'adapter']` allowlist | `integrations.ts:43`                                                                        | Any unknown directory name (e.g., `scaffold`) is silently ignored even if it ends in `s`                  |
| Integration `id` = directory name                               | Data-driven from filesystem listing                        | `integrations.ts:53`                                                                        | Renaming a starter directory changes its `id`, breaking any caller that checks `integration === 'old-id'` |
| `baseApp.target` set by caller before `backgroundInstallDeps()` | Runtime — must be set by caller                            | `install-deps.ts:103` via `baseApp.target!`                                                 | `backgroundInstallDeps` uses `path.resolve(baseApp.target!, '..')` — crashes if `target` is not set       |
| `process.cwd()`                                                 | Runtime                                                    | Various — `run-create-cli.ts`, `run-create-interactive-cli.ts`                              | Works in expected invocation; unexpected cwd produces wrong output directory                              |
| `QWIK_VERSION` global                                           | Build-time inject via esbuild `define`                     | `scripts/create-qwik-cli.ts:64`, `scripts/submodule-cli.ts:47`                              | If not injected, `(globalThis as any).QWIK_VERSION` is `undefined` — `intro()` shows `"vundefined"`       |

---

## Hidden Assumptions and Extraction Blockers

Assumptions that currently hold because create-qwik and the qwik CLI share a monorepo build pipeline, but would break if create-qwik were extracted into an independently published package that imports from `@qwik.dev/core`.

### 1. loadIntegrations() \_\_dirname Coupling (CRITICAL)

**Assumption:** When `loadIntegrations()` is called from create-qwik, `import.meta.url` resolves to `create-qwik/dist/index.mjs` so that `starters/` is found at `create-qwik/dist/starters/`.

**Why it holds today:** esbuild with `bundle: true` physically inlines `integrations.ts` source into each output bundle. There is no runtime ESM `import` of `@qwik.dev/core` — the code is duplicated into each bundle file, so `import.meta.url` reflects the bundle's own location.

**What breaks on extraction:** If create-qwik imported `loadIntegrations` from a separately installed `@qwik.dev/core` package (an ESM import, not bundled), `import.meta.url` would point to `node_modules/@qwik.dev/core/dist/cli.mjs`. The `starters/` directory does not exist there. Result: `loadIntegrations()` throws or returns an empty array; `makeTemplateManager` shows no templates; `create-qwik` scaffolding is silently or fatally broken.

**Remediation options:**

- Option A: Accept a `startersDir` parameter in `loadIntegrations()` — caller provides the path.
- Option B: Move `loadIntegrations()` into create-qwik's own source — stop sharing the function.
- Option C: Publish `starters/apps/` inside `@qwik.dev/core` and update the discovery path.

### 2. The Starters Are Not in the Published qwik Package (CRITICAL)

**Assumption:** `starters/apps/` is copied exclusively into `create-qwik/dist/`; `starters/features/` and `starters/adapters/` are copied exclusively into `packages/qwik/dist/`.

**Why it holds today:** Each build script (`scripts/submodule-cli.ts` and `scripts/create-qwik-cli.ts`) is responsible for its own starters subset; the split is enforced by `copyStartersDir` call arguments.

**What breaks on extraction:** If create-qwik and `@qwik.dev/core` were separately published npm packages, the starters each needs must be shipped inside that package. Currently:

- `@qwik.dev/core` ships `features/` + `adapters/`, but NOT `apps/`
- `create-qwik` ships `apps/`, but NOT `features/` or `adapters/`

A standalone create-qwik package that does NOT inline `loadIntegrations()` would have no path to the `apps/` starters it needs.

**Remediation:** Either co-ship `apps/` in `@qwik.dev/core` alongside existing starters, or move starters discovery entirely into create-qwik's own package.

### 3. updateApp() + CODE_MOD Global (SIGNIFICANT)

**Assumption:** The `CODE_MOD` global is `false` in the create-qwik bundle, suppressing `updateViteConfigs()` mutations during scaffolding.

**Why it holds today:** esbuild's `define` replaces `(globalThis as any).CODE_MOD` with the literal `false` at compile time for the create-qwik bundle.

**What breaks on extraction:** If create-qwik imported `updateApp` from a separately installed `@qwik.dev/core` package, `CODE_MOD` would be whatever was compiled into that package's distribution — which is `true` (set by `scripts/submodule-cli.ts`). `updateViteConfigs()` would then run during `create-qwik` scaffolding, corrupting newly created project vite configs.

**Remediation:** Expose `CODE_MOD` as an explicit parameter to `updateApp()` (e.g., `opts.applyViteConfig?: boolean`) instead of a build-time global.

### 4. Types Must Match Exactly (MODERATE)

**Assumption:** `IntegrationData`, `CreateAppResult`, `CreateAppOptions`, and `IntegrationType` as used in create-qwik match the definitions used in the qwik CLI — because they share the same TypeScript source file.

**Why it holds today:** Both packages compile from the same source file (`packages/qwik/src/cli/types.ts`) at build time; there is no version mismatch possible within a single monorepo build.

**What breaks on extraction:** If `@qwik.dev/core` published its types and create-qwik imported them, a version mismatch between installed `@qwik.dev/core` and the version create-qwik was tested against would cause TypeScript errors and potentially silent runtime mismatches (e.g., if `IntegrationData.target` semantics changed between versions).

**Remediation:** Extract shared types into a stable, separately versioned `@qwik.dev/cli-types` package, or duplicate them into create-qwik's own source.

### 5. syncBaseStarterVersionsFromQwik() Version Sync (MODERATE)

**Assumption:** During every create-qwik build, `syncBaseStarterVersionsFromQwik()` reads the current qwik version from the monorepo and writes it into `create-qwik/dist/starters/apps/base/package.json` devDependencies for `@qwik.dev/core`, `@qwik.dev/router`, `eslint-plugin-qwik`, `typescript`, and `vite`.

**Why it holds today:** Both packages are built together from the same monorepo; their versions are always in sync at build time.

**What breaks on extraction:** If create-qwik were released on an independent release cadence (e.g., as a standalone npm package not built alongside `@qwik.dev/core`), the base starter's `@qwik.dev/core`, `@qwik.dev/router`, and `eslint-plugin-qwik` devDependencies would be pinned to a stale version. Scaffolded projects would depend on old packages.

**Remediation:** Define an explicit version sync contract (e.g., create-qwik reads peer dependency version from `@qwik.dev/core` at runtime and injects it during scaffolding, rather than baking it in at build time).

### 6. jokes.json — Self-Contained (NO cross-package coupling, CONFIRMED)

**Finding:** `packages/create-qwik/src/helpers/jokes.ts` imports from `./jokes.json` — a local JSON file inside create-qwik. There is NO import from `packages/qwik/src/cli/joke/` or any other qwik CLI path.

This resolves the INVESTIGATE flag from Phase 5 compatibility contract. The joke coupling documented in Phase 5 (`run-joke-command.ts` in the qwik CLI) refers to the qwik CLI's own joke command, which uses its own internal jokes source. The create-qwik joke prompt is independently self-contained.

**No extraction blocker from this coupling point.**

### 7. Import Path Form Inconsistency (MINOR — maintenance risk)

**Assumption:** Both the `'packages/qwik/src/cli/...'` alias form and the `'../../qwik/src/cli/...'` relative form work at build time.

**Why it holds today:** The monorepo tsconfig and esbuild resolve both forms at build time.

**What breaks on extraction:** If either form stops resolving (e.g., repo layout changes, tsconfig path alias removed), imports would fail at build time. The inconsistency also makes bulk replacement of the import boundary harder — you must grep for two distinct patterns instead of one.

**Remediation:** Normalize all cross-package imports to a single canonical form (recommend: package name via `tsconfig.paths` alias or workspace protocol).

### 8. declared vs. Actually-Used Dependencies (MINOR — undeclared runtime deps)

`packages/create-qwik/package.json` declares these dependencies:

```json
{
  "dependencies": { "execa": "9.6.1" },
  "devDependencies": {
    "@clack/prompts": "0.11.0",
    "@types/yargs": "17.0.35",
    "kleur": "4.1.5",
    "yargs": "17.7.2"
  }
}
```

However, the following packages are **used by create-qwik at runtime** but are declared only in the qwik package, or not declared at all in create-qwik's manifest:

| Package          | Declared in create-qwik? | How it reaches the bundle                                                  |
| ---------------- | ------------------------ | -------------------------------------------------------------------------- |
| `which-pm-runs`  | No                       | Imported by `getPackageManager()` in `utils/utils.ts`; inlined via esbuild |
| `@clack/prompts` | devDependencies only     | Used at runtime; esbuild inlines it — not a declared runtime dep           |
| `kleur`          | devDependencies only     | Used at runtime; esbuild inlines it                                        |

**Why it holds today:** esbuild bundles all non-`external` dependencies inline; the consumer never needs to install them separately. The `external` list in `scripts/create-qwik-cli.ts` is: `['prettier', 'typescript', 'ts-morph', 'semver', 'ignore', 'execa']`. Everything not in that list is inlined.

**What breaks on extraction:** If create-qwik were built outside the monorepo (e.g., as an independent package build), the non-declared imports would fail unless the monorepo-sourced packages are available. The declared dependency list is misleading for any external build system.

**Remediation:** Declare all runtime-used packages as `dependencies` in `package.json`, or document explicitly that the package is only buildable inside the monorepo.

---

## Coupling Summary Table

| #   | Coupling Point                                                       | Type               | Severity        | What Must Change for Extraction                                                                  |
| --- | -------------------------------------------------------------------- | ------------------ | --------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `loadIntegrations()` `__dirname` path resolution                     | Runtime            | **CRITICAL**    | Ship starters alongside `loadIntegrations()` in same package, or make starters path configurable |
| 2   | `starters/apps/` not in published `@qwik.dev/core` dist              | Build / Asset      | **CRITICAL**    | Co-ship or provide a discovery API that accepts the starters path                                |
| 3   | `CODE_MOD` global gates `updateViteConfigs()` in `updateApp()`       | Build-time         | **SIGNIFICANT** | Expose as explicit `opts.applyViteConfig` parameter; remove global                               |
| 4   | Shared type definitions (`IntegrationData`, `CreateAppResult`, etc.) | API surface        | **MODERATE**    | Publish types in a shared package or duplicate them into create-qwik                             |
| 5   | `syncBaseStarterVersionsFromQwik()` bakes versions at build time     | Build / Versioning | **MODERATE**    | Define runtime version injection contract                                                        |
| 6   | jokes.json — self-contained                                          | N/A                | **NONE**        | No action required                                                                               |
| 7   | Import path form inconsistency (alias vs relative)                   | Maintenance        | **MINOR**       | Normalize all cross-package imports to one canonical form                                        |
| 8   | Undeclared runtime dependencies in `create-qwik/package.json`        | Build / Packaging  | **MINOR**       | Declare all runtime deps or document monorepo-only buildability                                  |

---

## Verified from Source

- **Branch:** build/v2
- **Commit:** bfe19e8d9
- **Files inspected:** All 6 create-qwik src files listed above, `packages/qwik/src/cli/types.ts`, `packages/qwik/src/cli/utils/utils.ts`, `packages/qwik/src/cli/utils/integrations.ts`, `packages/qwik/src/cli/utils/install-deps.ts`, `packages/qwik/src/cli/utils/log.ts`, `packages/qwik/src/cli/add/update-app.ts`, `scripts/submodule-cli.ts`, `scripts/create-qwik-cli.ts`, `packages/create-qwik/package.json`, `packages/create-qwik/src/helpers/jokes.ts`
- **Verification note on logSuccessFooter:** The plan's preliminary note stated "return value unused" for `logSuccessFooter`. Source inspection confirms `logAppCreated.ts` does `outString.push(logSuccessFooter(result.docs))` — the return value IS consumed via `Array.push()`. No bug. This note has been corrected in the Shared Helpers Catalog above.
