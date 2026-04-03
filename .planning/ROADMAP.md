# Roadmap: @qwik.dev/cli

## Overview

A spec-driven reimplementation of the Qwik CLI as a standalone `@qwik.dev/cli` package, extracted from the QwikDev monorepo. The build proceeds in six phases ordered by dependency: scaffold and core architecture first, then a spec-first test harness, then shared foundations and simple commands, then the build and new commands, then the complex add and upgrade commands, and finally the create-qwik scaffolding flow with check-client and packaging. Every phase delivers a verifiable capability; nothing ships until all 25 golden-path parity tests pass.

The v1.1 milestone (phases 7-11) corrects structural gaps from v1.0: type errors fixed first to establish a clean baseline, real starters content populated from the Qwik repo, migration folder restructured for version-chaining, tooling switched from Biome to oxfmt+oxlint in an isolated commit, and create-qwik implemented last when all its dependencies are in place.

The v1.2 milestone (phases 13-17) delivers comprehensive V2 migration automation: a parse-once fan-out transform infrastructure, behavioral AST transforms for hook API changes, context-aware JSX structural rewrites, config auto-validation, ecosystem migration for qwik-labs, and full test coverage for every new transform.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

### v1.0 Phases

- [x] **Phase 1: Scaffold and Core Architecture** - Repo skeleton with all extraction blockers resolved; Program base class, command router, and console utilities wired (completed 2026-04-02)
- [x] **Phase 2: Test Harness** - 6 static fixture projects, 25 golden-path Japa tests written spec-first, before any command implementation (completed 2026-04-02)
- [x] **Phase 3: Shared Foundations and Simple Commands** - Package manager detection, asset resolution services; version, joke, and help commands working end-to-end (completed 2026-04-02)
- [ ] **Phase 4: Build and New Commands** - Parallel build orchestration with lifecycle hooks; route and component file generation with token substitution
- [x] **Phase 5: Add and Upgrade Commands** - Integration installation with consent gate; AST-based migration with exact 5-step ordering and oxc-parser codemods (completed 2026-04-02)
- [ ] **Phase 6: Create-Qwik, Check-Client, and Packaging** - Standalone scaffolding binary; manifest-based staleness detection; dual ESM+CJS package published as @qwik.dev/cli

### v1.1 Phases

- [x] **Phase 7: Type Baseline** - Zero TypeScript type errors established before any structural change so regressions are detectable (completed 2026-04-02)
- [x] **Phase 8: Content Population** - All starters, adapters, features, and jokes sourced from the Qwik repo; top-level adapters/ artifact removed (completed 2026-04-02)
- [ ] **Phase 9: Migration Architecture** - Migrations folder restructured to migrations/v2/ with version-chaining support and upgrade command enhancements
- [x] **Phase 10: Tooling Switch** - Biome replaced by oxfmt + oxlint via vite-plus; vitest configured; isolated formatting commit (completed 2026-04-02)
- [x] **Phase 11: create-qwik Implementation** - Full interactive and non-interactive create-qwik binary with background install, git init, and complete test coverage (completed 2026-04-02)

### v1.2 Phases

- [x] **Phase 13: Transform Infrastructure** - SourceReplacement[] interfaces, apply-transforms.ts parse-once fan-out orchestrator, binary-extensions pruning, and simple import renames (completed 2026-04-03)
- [x] **Phase 14: Config Validation and Simple Behavioral Transform** - tsconfig.json and package.json auto-fix transforms; useVisibleTask$ eagerness option removal via AST (completed 2026-04-03)
- [ ] **Phase 15: Ecosystem Migration and Async Hook Transforms** - @builder.io/qwik-labs known-API migration with TODO warnings; useComputed$(async) and useResource$ rewrites (pending useAsync$ API clarification)
- [ ] **Phase 16: QwikCityProvider Structural Rewrite** - Context-aware QwikCityProvider → useQwikRouter() JSX structural rewrite for Qwik Router apps; Astro project skip
- [ ] **Phase 17: Transform Test Coverage** - Unit test fixture pairs for every new transform; end-to-end integration test validating full migration pipeline

## Phase Details

### Phase 1: Scaffold and Core Architecture
**Goal**: A compilable, installable package skeleton exists with all extraction blockers resolved and the Program lifecycle wired so any command can be added without rework
**Depends on**: Nothing (first phase)
**Requirements**: SCAF-01, SCAF-02, SCAF-03, SCAF-04, SCAF-05, SCAF-06, ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-07, ARCH-08
**Success Criteria** (what must be TRUE):
  1. `npm pack` produces a tarball that installs cleanly in an isolated directory with no missing dependencies and no `__dirname`-relative path errors at startup
  2. `qwik someUnknownCommand` prints a red error message and exits 1; `qwik help` exits 0 with all command names listed
  3. Tsdown builds dual ESM + CJS output and the `exports` field in package.json resolves both conditions correctly
  4. Biome runs clean with zero lint errors on the scaffolded source
  5. The `Program<T,U>` abstract base class enforces the parse -> validate -> interact -> execute lifecycle and subclasses cannot skip a stage
**Plans:** 3/3 plans complete

Plans:
- [ ] 01-01-PLAN.md — Repository scaffold: package.json, tsconfig, tsdown, biome, japa harness, types, stubs/ directory
- [ ] 01-02-PLAN.md — Core modules: Program<T,U> base class, console.ts utilities, AppCommand flag parser
- [ ] 01-03-PLAN.md — Command router, 8 command stubs, bin/qwik.ts entry point, build verification

### Phase 2: Test Harness
**Goal**: All 25 golden-path behavioral scenarios exist as executable Japa tests that currently fail (red), giving every subsequent phase a concrete pass/fail signal
**Depends on**: Phase 1
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. `node bin/test.ts` runs to completion without crashing the test runner itself (tests may fail, but the harness executes)
  2. All 6 static fixture projects (FX-01 through FX-06) exist on disk per PARITY-TEST-PLAN.md specifications; FX-07 and FX-08 are runtime outputs of CRE-01/CRE-02 tests and will be produced in Phase 6 when `bin/create-qwik.ts` exists
  3. Every test asserts an exit code (0 or 1); no test omits exit code assertion
  4. Mtime manipulation helpers (setMtimePast, setMtimeFuture) can alter file timestamps on FX-06 dist/q-manifest.json to simulate stale and up-to-date states for check-client scenarios
**Plans:** 4/4 plans complete

Plans:
- [ ] 02-01-PLAN.md — Test infrastructure: CLI subprocess helper, mtime helpers, 6 static fixture directories (FX-01 through FX-06)
- [ ] 02-02-PLAN.md — Golden-path tests: simple commands (VER-01, JOKE-01), build (BUILD-01-04), new (NEW-01-05), check-client (CHK-01-03)
- [ ] 02-03-PLAN.md — Golden-path tests: add (ADD-01-03), migrate-v2 (MIG-01-05), create-qwik (CRE-01-02)

### Phase 3: Shared Foundations and Simple Commands
**Goal**: Package manager detection and asset resolution services are available to all commands; the three simplest commands work correctly end-to-end with passing parity tests
**Depends on**: Phase 2
**Requirements**: ARCH-06, SIMP-01, SIMP-02, SIMP-03, SIMP-04
**Success Criteria** (what must be TRUE):
  1. `qwik version` outputs a bare semver string matching `/^\d+\.\d+\.\d+$/` with no label prefix and exits 0
  2. `qwik joke` prints setup and punchline from the static internal jokes array (no cross-package import) and exits 0 with no file writes
  3. `qwik help` displays all 9 command names with descriptions and exits 0
  4. Running `qwik` inside a pnpm project detects pnpm; running without any `npm_config_user_agent` falls back to pnpm
  5. Parity tests VER-01 and JOKE-01 pass
**Plans:** 2/2 plans complete

Plans:
- [ ] 03-01-PLAN.md — Package manager detection utility, version command with dual-path resolution
- [ ] 03-02-PLAN.md — Joke command with static jokes array, help command with 9 entries and PM-aware usage

### Phase 4: Build and New Commands
**Goal**: `qwik build` orchestrates project scripts with the correct sequential-then-parallel ordering and lifecycle hooks; `qwik new` generates route and component files with correct token substitution
**Depends on**: Phase 3
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07, NEW-01, NEW-02, NEW-03, NEW-04, NEW-05, NEW-06, NEW-07, NEW-08, NEW-09
**Success Criteria** (what must be TRUE):
  1. `qwik build` runs `build.client` sequentially first and only then runs `build.server`, `build.types`, and `lint` in parallel; scripts in FX-01 fixture execute in the documented order
  2. `qwik build preview` triggers `build.preview` instead of `build.server`; `--mode staging` is forwarded to each applicable script
  3. A failing script in the parallel phase sets `process.exitCode = 1` but does not abort other parallel scripts
  4. `qwik new /dashboard/[id]` creates `src/routes/dashboard/[id]/index.tsx` with `[slug]` and `[name]` tokens substituted; `qwik new header` creates `src/components/Header/Header.tsx`
  5. Attempting to create a file that already exists throws the exact duplicate guard error string documented in NEW-04
  6. Parity tests BUILD-01/02/03/04 and NEW-01/02/03/04/05 pass
**Plans:** 2/3 plans executed

Plans:
- [ ] 04-01-PLAN.md — Build command: sequential+parallel script orchestration with lifecycle hooks
- [ ] 04-02-PLAN.md — Template files, parseInputName helpers, and template loading system
- [ ] 04-03-PLAN.md — New command: inference, template selection, and file generation

### Phase 5: Add and Upgrade Commands
**Goal**: `qwik add` installs integrations through the full consent-and-install pipeline; `qwik upgrade` performs the 5-step migration in exact order with oxc-parser AST codemods and the substring-safe replacement sequence
**Depends on**: Phase 4
**Requirements**: ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06, ADD-07, ADD-08, ADD-09, UPGR-01, UPGR-02, UPGR-03, UPGR-04, UPGR-05, UPGR-06, UPGR-07, UPGR-08, UPGR-09, UPGR-10
**Success Criteria** (what must be TRUE):
  1. `qwik add react --skipConfirmation=true` writes integration files and installs dependencies without a user prompt; `qwik add react` without the flag shows the consent gate before writing anything
  2. `qwik migrate-v2` (the old alias) routes to the upgrade command and begins the same 5-step sequence as `qwik upgrade`
  3. The `@builder.io/qwik` package rename runs last in the replacement sequence; running the upgrade twice on the same project produces a correct no-op (idempotency)
  4. Binary files are skipped during text replacement; `.git/` and `node_modules/` are excluded from file traversal even when no `.gitignore` is present
  5. Cancelling the upgrade confirmation prompt exits 0 (not 1)
  6. Parity tests ADD-01/02/03 and MIG-01/02/03/04/05 pass
**Plans:** 4/4 plans complete

Plans:
- [ ] 05-01-PLAN.md — Dependencies, cloudflare-pages stub, visitNotIgnoredFiles and isBinaryPath utilities
- [ ] 05-02-PLAN.md — Add command: loadIntegrations, file merge, AddProgram with consent gate
- [ ] 05-03-PLAN.md — Migration modules: oxc-parser import rename, text replacement, version resolution
- [ ] 05-04-PLAN.md — Upgrade command: runV2Migration orchestrator, MigrateProgram, router upgrade alias

### Phase 6: Create-Qwik, Check-Client, and Packaging
**Goal**: The `create-qwik` binary scaffolds new Qwik projects end-to-end; `check-client` silently validates the manifest cache; the package is correctly configured for npm publication as @qwik.dev/cli
**Depends on**: Phase 5
**Requirements**: CRQW-01, CRQW-02, CRQW-03, CRQW-04, CRQW-05, CRQW-06, CRQW-07, CRQW-08, CHKC-01, CHKC-02, CHKC-03, CHKC-04, CHKC-05, PKG-01, PKG-02, PKG-03, PKG-04
**Success Criteria** (what must be TRUE):
  1. `create-qwik empty my-app` scaffolds a project in `./my-app`, runs `cleanPackageJson()` to remove `__qwik__` metadata, and exits 0 with next-steps instructions
  2. `create-qwik` interactive flow prompts for starter, project name, and package manager, and begins dependency install in the background while subsequent prompts are displayed
  3. `qwik check-client` on a project with an up-to-date `q-manifest.json` produces no output and exits 0; on a project with stale or missing manifest it runs `build.client` and exits accordingly
  4. `check-client` exits 0 in a CI environment with no TTY (fully non-interactive)
  5. `npm pack --dry-run` on the final package shows `stubs/` contents in the tarball, and `exports` resolves both `import` and `require` conditions to existing files
  6. Parity tests CHK-01/02/03 pass; all 25 golden-path parity tests are green
**Plans:** 2 plans

Plans:
- [ ] 15-01-PLAN.md — Extract shared walkNode utility, implement @builder.io/qwik-labs ecosystem migration transform (ECOS-01) with unit tests
- [ ] 15-02-PLAN.md — useComputed$(async) -> useAsync$ (XFRM-01), useResource$ -> useAsync$ (XFRM-03) transforms with tests, wire all Phase 15 transforms into run-migration.ts

### Phase 12: CI setup

**Goal:** GitHub Actions CI workflow runs all quality gates (format, lint, typecheck, build, Japa integration tests, Vitest unit tests) on every push to main and every PR
**Requirements**: CI-WORKFLOW
**Depends on:** Phase 11
**Plans:** 1/1 plans complete

Plans:
- [ ] 12-01-PLAN.md — Create .github/workflows/ci.yml with setup-vp, all quality gate steps, and concurrency control

---

## v1.1 Phase Details

### Phase 7: Type Baseline & Regex Cleanup
**Goal**: `tsc --noEmit` passes with zero errors across all existing source files and all regex patterns are replaced with magic-regexp for readability and type-safety, establishing a clean codebase before any structural change
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: TOOL-03, TOOL-06
**Success Criteria** (what must be TRUE):
  1. `tsc --noEmit` completes with zero errors and zero warnings on the current source tree
  2. All four confirmed error categories are resolved: `ModuleExportName` union in rename-import.ts, `exactOptionalPropertyTypes` in add/index.ts and console.ts, `cross-spawn` overload in update-app.ts, `noUncheckedIndexedAccess` in app-command.ts and router.ts
  3. All regex literals and `new RegExp()` calls are replaced with magic-regexp equivalents
  4. No runtime behavior changes — every existing Japa golden-path test that was passing before Phase 7 still passes after
**Plans:** 2/2 plans complete

Plans:
- [ ] 07-01-PLAN.md — Fix all 9 TypeScript compiler errors across 6 files (tsc --noEmit zero errors)
- [ ] 07-02-PLAN.md — Replace all 12 regex patterns with magic-regexp equivalents

### Phase 8: Content Population
**Goal**: All starters, adapters, features, and app templates are sourced from the Qwik monorepo and live in `stubs/`; `qwik add` presents the full 14-adapter and 22-feature menus; jokes draw from the real 30-joke pool; the incorrect top-level `adapters/` artifact is removed
**Depends on**: Phase 7
**Requirements**: STRT-01, STRT-02, STRT-03, STRT-04, STRT-05, TOOL-04
**Success Criteria** (what must be TRUE):
  1. `qwik add` interactive prompt lists all 14 deployment adapters as selectable options
  2. `qwik add` interactive prompt lists all 22 feature integrations as selectable options
  3. `stubs/apps/` contains all 4 app starters (base, empty, playground, library), each with a valid `__qwik__` metadata block in their package.json
  4. `qwik joke` outputs a joke drawn from the 30-entry pool sourced from the Qwik repo (not the original 10-entry hardcoded list)
  5. The top-level `adapters/` directory no longer exists in the repository
  6. `npm pack --dry-run` lists all starters content files in the tarball output
**Plans:** 2/2 plans complete

Plans:
- [ ] 08-01-PLAN.md — Populate stubs/ with all 14 adapters, 22 features, and 4 app starters from upstream Qwik monorepo
- [ ] 08-02-PLAN.md — Replace hardcoded jokes with full upstream pool, delete stray top-level adapters/ directory

### Phase 9: Migration Architecture
**Goal**: Migration code lives in a version-scoped `migrations/v2/` folder; the `upgrade` command checks and installs latest Qwik deps and can chain all required version migrations sequentially; running upgrade on a current project is a clean no-op; migration chaining has unit test coverage
**Depends on**: Phase 7
**Requirements**: MIGR-01, MIGR-02, MIGR-03, MIGR-04, MIGR-05, VTST-02
**Success Criteria** (what must be TRUE):
  1. The directory `src/migrate/` no longer exists; migration code lives in `migrations/v2/index.ts` which exports `runV2Migration(rootDir)`
  2. `qwik upgrade` checks for the latest `@qwik.dev/*` package versions and installs them if newer than what is installed
  3. `qwik upgrade` detects the current Qwik version from the project's package.json and runs only the migrations needed to reach the current release (v1 project chains through v2; an already-v2 project skips the v2 migration)
  4. Running `qwik upgrade` on a project already at the latest version produces no file changes and exits 0 with an "already up to date" message
  5. Vitest unit tests cover version detection, migration chain building, and sequential execution of the chaining orchestrator; all tests pass
**Plans:** 1/2 plans executed

Plans:
- [ ] 09-01-PLAN.md — Move migration code to migrations/v2/, create upgrade orchestration layer (detect-version, chain-builder, orchestrator), install Vitest
- [ ] 09-02-PLAN.md — Wire MigrateProgram to new orchestrator, verify full test suite (Vitest + Japa)

### Phase 10: Tooling Switch
**Goal**: Biome is fully replaced by oxfmt + oxlint via vite-plus; a single `vite.config.ts` drives formatting, linting, and testing; the switch lands as an isolated commit with no logic changes mixed in; vitest is available for unit tests
**Depends on**: Phase 9
**Requirements**: TOOL-01, TOOL-02, TOOL-05, VTST-01
**Success Criteria** (what must be TRUE):
  1. `biome.json` does not exist in the repository and `@biomejs/biome` does not appear in any package.json dependency field
  2. `vite.config.ts` exists at the repo root and configures oxfmt formatting, oxlint linting, and vitest test running as a unified toolchain
  3. Running the format check script produces no diff on the current source tree (all files already formatted by oxfmt)
  4. Running the lint script via oxlint exits 0 with zero errors on the current source
  5. Vitest can be invoked via `vite-plus` and discovers unit test files; existing Japa tests remain runnable alongside vitest unit tests
**Plans:** 1/1 plans complete

Plans:
- [ ] 10-01-PLAN.md — Install vite-plus, remove Biome, create unified vite.config.ts, reformat source with oxfmt

### Phase 11: create-qwik Implementation
**Goal**: `create-qwik` works as a standalone `npm create qwik` binary in both interactive and non-interactive modes; background dep install starts while prompts continue; generated projects have clean package.json and an initial git commit; unit tests cover all core logic; all Japa golden-path tests remain green
**Depends on**: Phase 8, Phase 10
**Requirements**: CRQW-09, CRQW-10, CRQW-11, CRQW-12, CRQW-13, CRQW-14, VTST-03, VTST-04, VTST-05
**Success Criteria** (what must be TRUE):
  1. `create-qwik base ./my-app` non-interactively scaffolds a project in `./my-app` using the base starter, removes `__qwik__` metadata from package.json, initializes a git repo with an initial commit, and exits 0
  2. `create-qwik` with no arguments launches the interactive 6-step flow (project dir, starter selection, package manager, install confirm, git init confirm, background install with a joke displayed) and exits 0 with next-steps output
  3. Dependency installation starts in the background as soon as the output directory is set, running concurrently while the user answers remaining prompts
  4. `npx create-qwik` resolves to the `bin/create-qwik.ts` entry point and runs correctly as a standalone binary (not a subcommand of `qwik`)
  5. Vitest unit tests pass for `createApp()` template resolution, `cleanPackageJson()` metadata removal, and `loadIntegrations()` discovery of all starter types (apps, adapters, features)
  6. All existing Japa golden-path tests remain green after create-qwik implementation is merged
**Plans:** 2/2 plans complete

Plans:
- [ ] 11-01-PLAN.md — Core scaffolding: loadAppStarters, cleanPackageJson, createApp, binary entry point, non-interactive CLI, unit tests
- [ ] 11-02-PLAN.md — Interactive 6-step flow with background dep install, git init, cancel handling

---

## v1.2 Phase Details

### Phase 13: Transform Infrastructure
**Goal**: The SourceReplacement[] / TransformFn interface and the parse-once fan-out orchestrator exist before any behavioral transform is written, establishing the magic-string collision-safe pattern as the mandatory baseline; simple import renames are added to the existing rename rounds
**Depends on**: Phase 12
**Requirements**: INFR-01, INFR-02, INFR-03, RNME-01, RNME-02
**Success Criteria** (what must be TRUE):
  1. `migrations/v2/types.ts` exports `SourceReplacement` and `TransformFn` interfaces; any transform written before this phase exists will refuse to compile without importing them
  2. `migrations/v2/apply-transforms.ts` parses each file once via oxc-parser, passes the same ParseResult to all registered TransformFn implementations, collects all returned SourceReplacement[] arrays, sorts them descending by start position, and applies all edits in a single MagicString pass
  3. A stub TransformFn added to the orchestrator in a Vitest unit test produces the expected output without throwing a magic-string range collision error, demonstrating the infrastructure is safe for multiple concurrent transforms
  4. `binary-extensions.ts` is reduced from 248 lines to ~50 essential extensions; the pruned list still correctly skips images, fonts, archives, executables, audio, and video files during migration traversal
  5. Running `qwik migrate-v2` on a fixture containing `QwikCityMockProvider` and `QwikCityProps` imports produces output with `QwikRouterMockProvider` and `QwikRouterProps` respectively
**Plans:** 2/2 plans complete

Plans:
- [ ] 13-01-PLAN.md — SourceReplacement/TransformFn types and applyTransforms parse-once fan-out orchestrator with unit tests
- [ ] 13-02-PLAN.md — Binary-extensions pruning (~50 entries) and RNME-01/RNME-02 import rename additions

### Phase 14: Config Validation and Simple Behavioral Transform
**Goal**: The migration command auto-fixes three common config errors that block Qwik v2 projects, and removes the removed eagerness option from useVisibleTask$ calls; both use the Phase 13 infrastructure and validate it end-to-end with real transforms
**Depends on**: Phase 13
**Requirements**: CONF-01, CONF-02, CONF-03, XFRM-02
**Success Criteria** (what must be TRUE):
  1. Running `qwik migrate-v2` on a project whose `tsconfig.json` has `jsxImportSource: "@builder.io/qwik"` auto-rewrites it to `@qwik.dev/core`; a project already set to `@qwik.dev/core` is not modified
  2. Running `qwik migrate-v2` on a project whose `tsconfig.json` has `moduleResolution: "Node"` or `"Node16"` auto-rewrites it to `"Bundler"`; a project already set to `"Bundler"` is not modified
  3. Running `qwik migrate-v2` on a project whose `package.json` lacks `"type": "module"` adds it; a project that already has it is not modified
  4. Running `qwik migrate-v2` on a file containing `useVisibleTask$({eagerness: 'load'}, ...)` produces output with the `eagerness` property removed from the options object; all other properties in the options object are preserved unchanged
  5. All three config transforms and the eagerness transform have Vitest unit tests with before/after fixture strings; every test passes
**Plans:** 2/2 plans complete

Plans:
- [ ] 14-01-PLAN.md — Config transforms (tsconfig jsxImportSource + moduleResolution, package.json type:module) with TDD + wire into runV2Migration Step 3b
- [ ] 14-02-PLAN.md — useVisibleTask$ eagerness removal AST transform with TDD + wire applyTransforms into runV2Migration Step 2b

### Phase 15: Ecosystem Migration and Async Hook Transforms
**Goal**: Known @builder.io/qwik-labs APIs are migrated to their v2 equivalents and unknown APIs receive TODO warning comments; useComputed$(async) and useResource$ are rewritten to the confirmed target API (blocked until project owner confirms useAsync$ availability)
**Depends on**: Phase 13
**Requirements**: ECOS-01, XFRM-01, XFRM-03
**Success Criteria** (what must be TRUE):
  1. Running `qwik migrate-v2` on a file that imports `usePreventNavigate` from `@builder.io/qwik-labs` rewrites the import to `@qwik.dev/router` and the usage is updated accordingly
  2. Running `qwik migrate-v2` on a file that imports an unknown `@builder.io/qwik-labs` API leaves the import in place and inserts a `// TODO: @builder.io/qwik-labs migration — <api> has no known v2 equivalent; manual review required` comment immediately above it
  3. Running `qwik migrate-v2` on a file containing `useComputed$(async () => ...)` rewrites it to the confirmed target hook call with the async body preserved (requires useAsync$ API clarification before this criterion is verifiable)
  4. Running `qwik migrate-v2` on a file containing `useResource$` rewrites the call to the confirmed target API; properties with clear equivalents are mapped automatically; properties that require manual review receive inline TODO comments
  5. ECOS-01, XFRM-01, and XFRM-03 each have Vitest unit tests with input/output fixture strings covering aliased import variants and multi-use-per-file cases
**Plans:** 2 plans

Plans:
- [ ] 15-01-PLAN.md — Extract shared walkNode utility, implement @builder.io/qwik-labs ecosystem migration transform (ECOS-01) with unit tests
- [ ] 15-02-PLAN.md — useComputed$(async) -> useAsync$ (XFRM-01), useResource$ -> useAsync$ (XFRM-03) transforms with tests, wire all Phase 15 transforms into run-migration.ts

### Phase 16: QwikCityProvider Structural Rewrite
**Goal**: The most complex AST transform — removing QwikCityProvider JSX element and injecting a useQwikRouter() hook call — works correctly for Qwik Router projects and is skipped entirely for Astro projects
**Depends on**: Phase 13
**Requirements**: XFRM-04
**Success Criteria** (what must be TRUE):
  1. Running `qwik migrate-v2` on a Qwik Router app's `root.tsx` that contains `<QwikCityProvider>...</QwikCityProvider>` removes the opening and closing elements without altering any children, and adds `const router = useQwikRouter()` at the top of the enclosing function body
  2. Running `qwik migrate-v2` on an Astro project (detected by absence of `@builder.io/qwik-city` in package.json) leaves any `QwikCityProvider` usage untouched and logs a skip message
  3. The transform correctly handles nested children of arbitrary depth — no child node content is overwritten or truncated
  4. Vitest unit tests cover: standard root.tsx rewrite, Astro project skip, and a file with multiple JSX nesting levels confirming children are preserved intact
**Plans:** 2 plans

Plans:
- [ ] 15-01-PLAN.md — Extract shared walkNode utility, implement @builder.io/qwik-labs ecosystem migration transform (ECOS-01) with unit tests
- [ ] 15-02-PLAN.md — useComputed$(async) -> useAsync$ (XFRM-01), useResource$ -> useAsync$ (XFRM-03) transforms with tests, wire all Phase 15 transforms into run-migration.ts

### Phase 17: Transform Test Coverage
**Goal**: Every new AST transform introduced in phases 13-16 has dedicated unit test fixture pairs, and a single integration test fixture exercises the complete migration pipeline end-to-end to confirm all transforms compose correctly
**Depends on**: Phase 14, Phase 15, Phase 16
**Requirements**: MTEST-01, MTEST-02
**Success Criteria** (what must be TRUE):
  1. Each transform module (use-visible-task, tsconfig-transform, package-json-transform, qwik-labs, use-async, qwik-city-provider) has at least one Vitest test file with input/output fixture string pairs covering the happy path, the no-op/idempotent path, and at least one edge case
  2. A combined fixture file containing all migratable patterns (qwik-labs import, useVisibleTask$ with eagerness, useComputed$ async, useResource$, QwikCityProvider) is run through the full `runV2Migration()` pipeline in a single integration test; the output matches a known-good expected string with all transforms applied in the correct order
  3. All Vitest unit tests pass with zero failures
  4. All existing Japa golden-path integration tests remain green after the v1.2 changes are merged
**Plans:** 2 plans

Plans:
- [ ] 15-01-PLAN.md — Extract shared walkNode utility, implement @builder.io/qwik-labs ecosystem migration transform (ECOS-01) with unit tests
- [ ] 15-02-PLAN.md — useComputed$(async) -> useAsync$ (XFRM-01), useResource$ -> useAsync$ (XFRM-03) transforms with tests, wire all Phase 15 transforms into run-migration.ts

## Progress

**Execution Order:**
v1.0: Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
v1.1: Phases execute in dependency order: 7 -> 8 -> 9 -> 10 -> 11 (Phase 8 and 9 can run in parallel after Phase 7; Phase 11 depends on both Phase 8 and Phase 10)
v1.2: Phases execute in dependency order: 13 -> 14, 15, 16 (in parallel after 13) -> 17

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold and Core Architecture | 3/3 | Complete | 2026-04-02 |
| 2. Test Harness | 4/4 | Complete | 2026-04-02 |
| 3. Shared Foundations and Simple Commands | 2/2 | Complete | 2026-04-02 |
| 4. Build and New Commands | 2/3 | In Progress | - |
| 5. Add and Upgrade Commands | 4/4 | Complete | 2026-04-02 |
| 6. Create-Qwik, Check-Client, and Packaging | 0/TBD | Not started | - |
| 7. Type Baseline | 2/2 | Complete   | 2026-04-02 |
| 8. Content Population | 2/2 | Complete   | 2026-04-02 |
| 9. Migration Architecture | 1/2 | In Progress|  |
| 10. Tooling Switch | 1/1 | Complete    | 2026-04-02 |
| 11. create-qwik Implementation | 2/2 | Complete    | 2026-04-02 |
| 12. CI setup | 1/1 | Complete | 2026-04-03 |
| 13. Transform Infrastructure | 2/2 | Complete    | 2026-04-03 |
| 14. Config Validation and Simple Behavioral Transform | 2/2 | Complete    | 2026-04-03 |
| 15. Ecosystem Migration and Async Hook Transforms | 0/2 | Planning complete | - |
| 16. QwikCityProvider Structural Rewrite | 0/TBD | Not started | - |
| 17. Transform Test Coverage | 0/TBD | Not started | - |
