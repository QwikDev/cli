# Project Research Summary

**Project:** @qwik.dev/cli — Standalone Qwik CLI reimplementation
**Domain:** Node.js CLI tooling — extraction from monorepo to standalone npm package
**Researched:** 2026-04-02 (v1.1 milestone update; v1.0 summary preserved and extended)
**Confidence:** HIGH

## Executive Summary

This project is a behavioral-parity reimplementation and standalone extraction of the Qwik CLI from the QwikDev monorepo into an independently releasable `@qwik.dev/cli` package. The v1.0 milestone established the full 9-command surface (add, build, build preview, new, joke, migrate-v2, check-client, help, version), AST-based codemods via oxc-parser, the `Program<T,U>` base class lifecycle, and the `stubs/` template architecture. The v1.1 milestone now adds the `create-qwik` scaffolding binary (interactive and non-interactive), populates all starters content that was absent (14 adapters, 22 features, 4 app starters), restructures the migration folder for future version-chaining, replaces Biome with oxfmt + oxlint, and closes all known TypeScript strict mode errors.

The recommended approach for v1.1 executes changes in strict dependency order: type error baseline first, content population second, migration restructuring third, tooling switch fourth (isolated commit), create-qwik implementation fifth, and final type audit plus npm packaging verification last. This order is not arbitrary — it is dictated by concrete code dependencies. `create-qwik` cannot be tested without app starters. The type error audit is only meaningful once all structural changes are in place. The formatter switch must be isolated to prevent git blame pollution. The architecture is well-positioned to absorb these changes: `stubs/`, `update-app.ts`, and the `Program` pattern are all reusable without modification.

The key risks are known and enumerated. Four TypeScript strict mode error categories have exact file-and-line confirmation (Pitfalls 9–12). The `CODE_MOD` global in `updateApp()` must be replaced with an explicit `applyViteConfig` parameter before `create-qwik` calls it (Pitfall 2). The `.git/` directory corruption risk in `visitNotIgnoredFiles` requires a one-line hard exclusion guard (Pitfall 6). The npm tarball must be verified to include `stubs/` before any release (Pitfall 15). None of these are complex — they are all one-line-to-one-PR fixes that become expensive only if deferred past the point of structural change.

## Key Findings

### Recommended Stack

The v1.0 stack is unchanged and appropriate. For v1.1, the only dependency changes are removing `@biomejs/biome` and adding `oxlint@^1.58.0` and `oxfmt@^0.42.0` from the same oxc-project ecosystem that already supplies `oxc-parser`. No new runtime dependencies are required. The `create-qwik` flow reuses all existing runtime deps (`@clack/prompts`, `yargs`, `cross-spawn`, `fs-extra`, `panam`, `kleur`), and the migration restructuring uses only `semver` which is already present.

**Core technologies:**
- `@clack/prompts@^0.11.0`: Interactive terminal prompts — used in reference impl; reused by create-qwik interactive flow
- `yargs@^18.0.0`: CLI argument parsing — supports 9-subcommand surface + create-qwik positional args; ESM-first
- `cross-spawn@^7.0.6`: Cross-platform process spawning — handles git init and dep install in create-qwik; use over execa for subprocess consistency
- `fs-extra@^11.3.0`: File system operations — essential for stubs/ template copying and create-qwik scaffolding
- `kleur@^4.1.5`: Terminal colors — zero deps, fast, NO_COLOR support
- `panam@^0.3.0`: Package manager abstraction — unified `pm.install()` across npm/yarn/pnpm/bun
- `oxc-parser@^0.123` + `magic-string@^0.30`: AST-based codemods — Rust-based, 3x faster than swc, already in project
- `semver@^7.7.4`: Version parsing — already present; drives migration version-chaining detection
- `tsdown@^0.20.1`: Dual ESM+CJS build — entry array must be extended with `bin/create-qwik.ts`
- `oxlint@^1.58.0` (v1.1 new): Linting — replaces Biome; ESLint v8-compatible config; oxc-project ecosystem
- `oxfmt@^0.42.0` (v1.1 new): Formatting — replaces Biome; beta but 100% Prettier conformance; oxc-project ecosystem

### Expected Features

**Must have — v1.1 table stakes (all must ship together):**
- stubs/adapters/ fully populated (all 14 adapters) — `qwik add` shows only 1 option without this
- stubs/features/ fully populated (all 22 features) — `qwik add` feature list is empty without this
- stubs/apps/ populated (base, empty, playground, library) — `create-qwik` throws AppNotFoundError without this
- Remove top-level `adapters/` folder — incorrect duplicate artifact at repo root
- migrations/v2/ scoped folder — prerequisite for version-chaining architecture; rename + 1 import update
- create-qwik non-interactive mode — CI/scripting standard (`<template> <outDir> [--force] [--installDeps]`)
- create-qwik interactive mode — 6-step flow: project dir prompt, starter select, dep install confirm, git init confirm, background install with joke, `logAppCreated()`
- oxfmt + oxlint replacing Biome — toolchain alignment; config swap, devDep swap, isolated commit
- Zero TypeScript type errors — compile correctness gate; 4 error categories confirmed with exact file/line

**Should have — v1.1 differentiators:**
- Background dep install during create-qwik prompts — starts after outDir is set; abortable on cancel
- Real jokes.json (30-joke pool) — replaces 10 hardcoded jokes; drop-in file replacement

**Defer to v1.x:**
- upgrade --migrate chaining orchestrator — plumbing for v1→vN; needs v3 scenario to fully validate
- Starters version sync at publish time — runtime version injection for starter package.json dep versions

**Defer to v2+:**
- v3 migration — when Qwik v3 ships, add `migrations/v3/`
- Automated template sync from upstream at release time

### Architecture Approach

The architecture uses a `stubs/` directory as the single source of truth for all integration templates, a `Program<T,U>` base class lifecycle for each command, and a `bin/` shebang entry pattern for each binary. The new `create-qwik` binary is a second binary entry point (not a subcommand of `qwik`): thin `bin/create-qwik.ts` calls `runCreateCli()` from a new `src/create-qwik/` module that reuses `src/integrations/update-app.ts` with `applyViteConfig: false`. The migration utilities move from `src/migrate/` to a top-level `migrations/v2/` directory to enable version-chaining isolation; the single inbound import path in `src/commands/migrate/index.ts` is the only production code change.

**Major components:**
1. `bin/qwik.ts` + `bin/create-qwik.ts` — thin shebang entries; no logic; both compiled by tsdown
2. `src/router.ts` + `src/commands/*` — 9-command routing and implementations (unchanged in v1.1)
3. `src/create-qwik/` — new create-qwik Program; `index.ts` exports `runCreateCli()`; `template-manager.ts` loads `stubs/apps/`; delegates file writes to `src/integrations/update-app.ts`
4. `stubs/adapters/` + `stubs/features/` + `stubs/apps/` + `stubs/templates/` — all integration content; populated from Qwik monorepo; resolved via `__dirname`-relative path in package-local load functions
5. `migrations/v2/` — scoped migration utilities at repo root (parallel to `src/`, `stubs/`, `bin/`); exports `runV2Migration(rootDir)`
6. `src/integrations/load-integrations.ts` + `src/integrations/update-app.ts` — shared integration loading and file-merge layer; reused by both `qwik add` and `create-qwik`
7. `.oxlintrc.json` + `.oxfmtrc.json` — replace `biome.json`; separate config files, no combined format

### Critical Pitfalls

1. **`CODE_MOD` global corrupts create-qwik scaffolding** — `updateApp()` reads `(globalThis as any).CODE_MOD` to decide whether to call `updateViteConfigs()`. This must be replaced with an explicit `applyViteConfig?: boolean` parameter before `create-qwik` calls `updateApp()`. Calling it with the current global will corrupt freshly scaffolded vite configs.

2. **TypeScript strict mode errors — 4 confirmed categories** — `exactOptionalPropertyTypes` in `src/commands/add/index.ts` and `src/console.ts`; `noUncheckedIndexedAccess` in `src/app-command.ts` and `src/router.ts`; `cross-spawn` overload on `string | undefined` in `src/integrations/update-app.ts`; `oxc-parser` `ModuleExportName` union (`.name` vs `.value`) in `src/migrate/rename-import.ts`. All have exact fixes documented; fix before structural changes to establish a clean baseline.

3. **Package rename substring ordering** — `@builder.io/qwik` is a string prefix of `@builder.io/qwik-city` and `@builder.io/qwik-react`. It must always be replaced last (Call 5 of 5). Any sorting, deduplication, or parallelization of the 5-call sequence corrupts output silently.

4. **`.git/` directory corruption in migration** — `visitNotIgnoredFiles` with no `.gitignore` visits `.git/` internals. Hard-code `.git/` and `node_modules/` exclusions regardless of `.gitignore` existence.

5. **Migration folder restructuring breaks test imports silently** — TypeScript `exclude: ["tests"]` means broken imports in test files won't appear in `tsc --noEmit`. Run `grep -r "from.*migrate" src/ tests/` before moving any file; restructure in a single atomic step.

6. **Formatter switch pollutes git blame** — The Biome → oxfmt switch must be an isolated commit with no functional changes. Mixing it with migration restructuring or type fixes makes code review impossible.

7. **npm tarball missing starters** — `stubs/` must be in `package.json` `files`. Nested `.gitignore` files inside starter templates (e.g., `starters/apps/base/.gitignore`) can cause npm to silently exclude subdirectories. Run `npm pack --dry-run` before every publish.

## Implications for Roadmap

The v1.1 implementation order is dictated by hard dependencies. Content population unlocks create-qwik. Type error baseline enables safe structural change verification. Migration restructuring must complete before version chaining. Tooling switch must be isolated. The six-phase sequence below reflects these constraints.

### Phase 1: Type Error Baseline

**Rationale:** Establishes a clean `tsc --noEmit` before any structural changes. Without this, it is impossible to distinguish pre-existing errors from errors introduced by restructuring. All four error categories are fully enumerated in PITFALLS.md (Pitfalls 9–12) with exact file, line, and fix patterns.
**Delivers:** Clean `tsc --noEmit` output; known-good compile state
**Addresses:** Pitfalls 9 (`ModuleExportName` union), 10 (`exactOptionalPropertyTypes`), 11 (`cross-spawn` overload), 12 (`noUncheckedIndexedAccess`)
**Avoids:** Pre-existing bugs hidden under structural change diffs
**Research flag:** Skip — all errors and fixes are documented with exact locations

### Phase 2: Content Population

**Rationale:** File copy from the Qwik monorepo with no code changes. No dependencies on other phases. Unblocks create-qwik. The top-level `adapters/` deletion and the jokes.json replacement are included here as they are also zero-code changes.
**Delivers:** Functional `qwik add` (14 adapters + 22 features); starters ready for create-qwik; clean repo root; 30-joke pool
**Addresses:** stubs/adapters/ fully populated, stubs/features/ fully populated, stubs/apps/ populated, top-level adapters/ removed, real jokes.json
**Avoids:** AppNotFoundError in template manager; empty add command menus
**Research flag:** Skip — file copy from verified upstream source; `__qwik__` metadata pattern is documented

### Phase 3: Migration Restructuring

**Rationale:** Moving `src/migrate/` to `migrations/v2/` is a pure rename with one import path update. Must complete before the upgrade --migrate chaining orchestrator can be built. Run a full grep audit before moving files (Pitfall 13).
**Delivers:** `migrations/v2/index.ts` exports `runV2Migration(rootDir)`; `src/commands/migrate/index.ts` import path updated; `src/migrate/` deleted; all tests still pass
**Addresses:** migrations/v2/ scoped folder requirement; enables future v3 isolation
**Avoids:** Pitfall 13 (broken test-file imports); future version file collisions in a flat structure
**Research flag:** Skip — import path update is mechanical; one inbound import confirmed in ARCHITECTURE.md

### Phase 4: Tooling Switch (Biome to oxfmt + oxlint)

**Rationale:** Must be an isolated commit. Independent of all other phases. Placing it here — after structural cleanup and before new feature code — ensures the diff is pure formatting with no logic mixed in. oxfmt's `--migrate biome` command converts the config automatically.
**Delivers:** `oxfmt` + `oxlint` replace `@biomejs/biome`; `.oxlintrc.json` + `.oxfmtrc.json` created; `biome.json` deleted; package.json scripts updated; CI format check updated
**Addresses:** Toolchain alignment with oxc-project ecosystem; removes Biome as a non-oxc Rust dependency
**Avoids:** Pitfall 14 (git blame pollution from mixed commits); CI script mismatch after switch
**Research flag:** Skip — config swap is mechanical; oxfmt migration command handles config translation; oxlint rule gap should be audited against current biome.json rules before switching

### Phase 5: create-qwik Implementation

**Rationale:** Depends on stubs/apps/ being populated (Phase 2). The `CODE_MOD` global in `updateApp()` must be replaced with `applyViteConfig` parameter before this phase starts. Background dep install is included — it is the primary create-qwik differentiator and is verified in upstream source.
**Delivers:** `bin/create-qwik.ts` entry; `src/create-qwik/` module with `runCreateCli()`; `src/create-qwik/template-manager.ts` loading `stubs/apps/`; interactive 6-step flow; non-interactive positional arg mode; background dep install (abortable on cancel); git init flow; `logAppCreated()` success output; package.json `bin` entry + tsdown entry update
**Addresses:** create-qwik non-interactive, create-qwik interactive, background dep install, CODE_MOD refactor
**Avoids:** Pitfall 2 (CODE_MOD — `applyViteConfig: false` must be verified in integration test); Pitfall 7 (stale starter versions — define runtime version injection approach); Pitfall 8 (undeclared runtime deps)
**Research flag:** Needs phase research — background install abort pattern with `cross-spawn` vs the reference's `execa` needs validation. Runtime version injection mechanism for starter `package.json` dep versions needs a confirmed approach before implementation (two candidates: read from installed `@qwik.dev/core/package.json` vs peer resolution in ESM context).

### Phase 6: Final Type Audit and npm Packaging Verification

**Rationale:** Done last, after all structural changes and new code are in place. New create-qwik code introduces new type surfaces. npm packaging verification must happen before any release.
**Delivers:** Zero type errors (new create-qwik surfaces + any regressions from structural changes); `npm pack --dry-run` verified with `stubs/` confirmed in tarball; tarball size within reasonable bounds
**Addresses:** Zero type errors milestone gate; starters included in npm tarball (Pitfall 15)
**Avoids:** Shipping type-broken output; botched publish with missing starters
**Research flag:** Skip — type fixes follow documented patterns; npm packaging verification is a checklist step

### Phase Ordering Rationale

- Type baseline first: structural changes would obscure pre-existing errors; clean baseline is required to verify restructuring correctness
- Content population second: pure file work with no risk; immediately unblocks create-qwik; no reason to delay
- Migration restructuring third: one-import-path change; easiest to verify in isolation before new code is added
- Tooling switch fourth: must be isolated; placing it between structural work and feature work makes it a clean standalone commit
- create-qwik fifth: depends on stubs/apps/ (Phase 2); benefits from clean compile baseline; CODE_MOD refactor needed first
- Final audit last: only meaningful when all new surfaces are in place

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (create-qwik):** Background dep install abort pattern with `cross-spawn` (vs reference's `execa`), and runtime version injection for starter `package.json` dep versions, need confirmed approaches before implementation

Phases with standard patterns (skip research-phase):
- **Phase 1 (Type Errors):** All errors enumerated with exact fixes in PITFALLS.md
- **Phase 2 (Content):** File copy from verified upstream; `__qwik__` metadata pattern is fully documented
- **Phase 3 (Migration Restructure):** Single import path change; verified in ARCHITECTURE.md
- **Phase 4 (Tooling Switch):** Config swap; oxfmt migration command handles it automatically
- **Phase 6 (Type Audit + Packaging):** Mechanical verification steps with documented checklist

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | v1.1 versions verified against npm registry and oxc.rs official docs; all existing deps confirmed from package.json |
| Features | HIGH | 5 spec documents + 67 MUST PRESERVE behaviors; create-qwik flow verified from upstream source files at commit bfe19e8d9 |
| Architecture | HIGH | All integration points verified against actual source files; component boundaries confirmed by direct source inspection |
| Pitfalls | HIGH | v1.1 pitfalls sourced from live `tsc --noEmit` output with exact file/line references; all fixes documented |

**Overall confidence:** HIGH

### Gaps to Address

- **Runtime version injection for starters (Pitfall 7 / EB-05):** `stubs/apps/base/package.json` should write the runtime-resolved `@qwik.dev/core` version into scaffolded projects rather than a hardcoded constant. Two candidate approaches exist (read from `node_modules/@qwik.dev/core/package.json` vs peer dep resolution). The correct approach in an ESM + tsdown bundled context needs validation before Phase 5 implementation. Mark as a pre-implementation decision in Phase 5 planning.

- **Background install abort with `cross-spawn`:** The reference `create-qwik` uses `execa` for the background install because execa has native promise/abort ergonomics. This project uses `cross-spawn` for subprocess consistency. Before Phase 5, validate that `cross-spawn` supports the `backgroundInstall.abort()` pattern — if not, this is the one justified case for adding `execa` as a targeted dep.

- **oxlint rule coverage gap vs Biome:** Biome's lint ruleset is broader than oxlint's current coverage. Before Phase 4 (tooling switch), audit which rules in the current `biome.json` have no oxlint equivalent. Document any gaps and decide whether to accept them or add workarounds (e.g., a custom eslint plugin for specific rules).

- **`updateConfigurations()` in migrate-v2 (OQ-03):** This function is deliberately commented out. FEATURES.md classifies re-enabling it as an anti-feature until PR #7159 edge cases are investigated. Not blocking for v1.1 but should be tracked as a known open question before any migration enhancement work.

- **`process.cwd()` vs rootDir in migrate-v2 (OQ-02):** Currently uses `process.cwd()` for consistency with existing behavior. This is a known limitation for pnpm workspace monorepos. Acceptable for v1.1 parity; flag for v2 investigation.

## Sources

### Primary (HIGH confidence)

- Qwik monorepo `packages/create-qwik/src/` (build/v2 branch, commit bfe19e8d9) — interactive + non-interactive create-qwik flows; background install pattern
- Qwik monorepo `packages/qwik/dist/starters/` — adapter/feature/app content verified
- `specs/COMPATIBILITY-CONTRACT.md` — 67 MUST PRESERVE behaviors
- `specs/ASSET-INVENTORY.md` — full starters catalog: 14 adapters, 22 features, 4 app starters
- `specs/MIG-WORKFLOW.md` — migration step-by-step behavioral spec
- `src/integrations/load-integrations.ts`, `src/commands/migrate/index.ts`, `src/migrate/run-migration.ts`, `tsdown.config.ts`, `package.json`, `biome.json` — current codebase direct source reads
- Live `tsc --noEmit` output — confirmed TypeScript errors with file/line references (Pitfalls 9–12)
- oxlint npm (npmx.dev) — v1.58.0 confirmed latest, published 2026-03-31
- oxfmt npm (npmx.dev) — v0.42.0 confirmed latest, published 2026-03-30
- [oxc.rs linter docs](https://oxc.rs/docs/guide/usage/linter.html) — config file format, TypeScript plugin
- [oxc.rs formatter docs](https://oxc.rs/docs/guide/usage/formatter.html) — install, script patterns, config format
- [Oxfmt Beta announcement](https://oxc.rs/blog/2026-02-24-oxfmt-beta) — supported file types, migration from Biome/Prettier, production readiness

### Secondary (MEDIUM confidence)

- [oxlint config file reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference) — .oxlintrc.json schema, TypeScript plugin setup
- [oxc.rs compatibility](https://oxc.rs/compatibility.html) — production readiness, framework support matrix
- [Oxlint JS Plugins Alpha announcement](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha) — current ecosystem status
- Web search: oxlint 1.58.0 + oxfmt 0.42.0 config patterns — cross-validated with official docs

---
*Research completed: 2026-04-02*
*Ready for roadmap: yes*
