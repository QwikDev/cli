# Roadmap: @qwik.dev/cli

## Overview

A spec-driven reimplementation of the Qwik CLI as a standalone `@qwik.dev/cli` package, extracted from the QwikDev monorepo. The build proceeds in six phases ordered by dependency: scaffold and core architecture first, then a spec-first test harness, then shared foundations and simple commands, then the build and new commands, then the complex add and upgrade commands, and finally the create-qwik scaffolding flow with check-client and packaging. Every phase delivers a verifiable capability; nothing ships until all 25 golden-path parity tests pass.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Scaffold and Core Architecture** - Repo skeleton with all extraction blockers resolved; Program base class, command router, and console utilities wired (completed 2026-04-02)
- [x] **Phase 2: Test Harness** - 6 static fixture projects, 25 golden-path Japa tests written spec-first, before any command implementation (completed 2026-04-02)
- [x] **Phase 3: Shared Foundations and Simple Commands** - Package manager detection, asset resolution services; version, joke, and help commands working end-to-end (completed 2026-04-02)
- [ ] **Phase 4: Build and New Commands** - Parallel build orchestration with lifecycle hooks; route and component file generation with token substitution
- [ ] **Phase 5: Add and Upgrade Commands** - Integration installation with consent gate; AST-based migration with exact 5-step ordering and oxc-parser codemods
- [ ] **Phase 6: Create-Qwik, Check-Client, and Packaging** - Standalone scaffolding binary; manifest-based staleness detection; dual ESM+CJS package published as @qwik.dev/cli

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
  5. The `Program<T,U>` abstract base class enforces the parse → validate → interact → execute lifecycle and subclasses cannot skip a stage
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
**Plans:** 4 plans

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
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold and Core Architecture | 3/3 | Complete   | 2026-04-02 |
| 2. Test Harness | 4/4 | Complete   | 2026-04-02 |
| 3. Shared Foundations and Simple Commands | 2/2 | Complete   | 2026-04-02 |
| 4. Build and New Commands | 2/3 | In Progress|  |
| 5. Add and Upgrade Commands | 0/4 | Not started | - |
| 6. Create-Qwik, Check-Client, and Packaging | 0/TBD | Not started | - |
