# Requirements: @qwik.dev/cli

**Defined:** 2026-04-01
**Core Value:** Every command in the existing Qwik CLI must work identically in the new package — 67 MUST PRESERVE behaviors cannot regress.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Scaffolding

- [x] **SCAF-01**: Repo has package.json, tsconfig, tsdown config producing ESM + CJS dual output
- [x] **SCAF-02**: Biome configured for linting and formatting from day one
- [x] **SCAF-03**: Japa test harness configured with bin/test.ts entry point
- [x] **SCAF-04**: `stubs/` directory established with explicit path resolution (no __dirname hacks)
- [x] **SCAF-05**: Node.js engine floor declared (>=20.19.0 per yargs@18 requirement)
- [x] **SCAF-06**: All 7 extraction blockers resolved before command implementation begins

### Core Architecture

- [x] **ARCH-01**: `Program<T,U>` abstract base class with parse → validate → interact → execute lifecycle
- [x] **ARCH-02**: Subcommand router dispatching argv[2] to Program subclasses via dynamic imports
- [x] **ARCH-03**: `console.ts` prompt/color utilities wrapping @clack/prompts and kleur
- [x] **ARCH-04**: `AppCommand` flag parsing with `getArg()` supporting `--flag=value` and `--flag value` forms
- [x] **ARCH-05**: `printHeader()` ASCII art logo displayed before every command
- [x] **ARCH-06**: Package manager auto-detection via which-pm-runs with pnpm fallback
- [x] **ARCH-07**: `bye()` (outro + exit 0) and `panic()` (error + exit 1) exit helpers
- [x] **ARCH-08**: Unrecognized command handling: red error message + print help + exit 1

### Test Harness

- [x] **TEST-01**: 6 static fixture projects (FX-01 through FX-06) created per PARITY-TEST-PLAN.md; FX-07 and FX-08 are runtime outputs of create-qwik tests (CRE-01, CRE-02) produced in Phase 6
- [x] **TEST-02**: 25 golden-path test scenarios encoded as Japa tests (spec-first, before implementation)
- [x] **TEST-03**: Exit code assertions on every command test (0 for success/cancel, 1 for error)
- [x] **TEST-04**: Fixture mutation helpers for mtime manipulation (check-client scenarios)

### Build Command

- [x] **BUILD-01**: `qwik build` runs `build.client` sequentially first, then `build.server`/`build.types`/`lint` in parallel
- [x] **BUILD-02**: `qwik build preview` triggers `build.preview` instead of `build.server`
- [x] **BUILD-03**: `--mode <value>` forwarded to `build.client`, `build.lib`, `build.preview`, `build.server`
- [x] **BUILD-04**: `prebuild.*` scripts discovered and run sequentially BEFORE parallel build
- [x] **BUILD-05**: `postbuild.*` scripts discovered and run sequentially AFTER parallel build
- [x] **BUILD-06**: `process.exitCode = 1` on any script failure (non-throw, allows parallel steps to finish)
- [x] **BUILD-07**: `ssg` script runs after `build.static` in preview mode when both present

### New Command

- [x] **NEW-01**: `qwik new /path` creates route in `src/routes/` with `[slug]`/`[name]` token substitution
- [x] **NEW-02**: `qwik new name` (no leading `/`) creates component in `src/components/`
- [x] **NEW-03**: `qwik new /path.md` and `/path.mdx` create markdown/MDX routes
- [x] **NEW-04**: Duplicate file guard throws `"${filename}" already exists in "${outDir}"`
- [x] **NEW-05**: `--<templateId>` flag selects template; default template `qwik` when positional given
- [x] **NEW-06**: Auto-select template when exactly 1 template found (no prompt)
- [x] **NEW-07**: `fs.mkdirSync(outDir, { recursive: true })` creates parent directories
- [x] **NEW-08**: Interactive prompt flow: select type → text name → select template (each conditional)
- [x] **NEW-09**: `parseInputName()` slug and PascalCase transformation; split on `[-_\s]` only

### Add Command

- [x] **ADD-01**: `qwik add [integration-id]` positional argument selects integration
- [x] **ADD-02**: `--skipConfirmation=true` flag bypasses user consent gate
- [x] **ADD-03**: `--projectDir=<path>` flag writes files into specified subdirectory
- [x] **ADD-04**: Interactive integration selection via @clack/prompts select when no positional
- [x] **ADD-05**: Integration file writes committed only after user confirmation (or --skipConfirmation)
- [x] **ADD-06**: `installDeps()` runs when integration adds dependencies
- [x] **ADD-07**: `postInstall` script execution when `integration.pkgJson.__qwik__.postInstall` exists
- [x] **ADD-08**: `loadIntegrations()` discovers integrations from `stubs/` directory
- [x] **ADD-09**: Exit 0 on success, exit 1 on file-write or install failure

### Upgrade Command

- [x] **UPGR-01**: `qwik migrate-v2` alias routes to upgrade command (ALIAS REQUIRED)
- [x] **UPGR-02**: 5-step migration sequence executes in exact documented order
- [x] **UPGR-03**: AST import renaming: 3 rounds, 8 mappings via oxc-parser + magic-string
- [x] **UPGR-04**: Text-replacement `replacePackage()` × 5 calls — `@builder.io/qwik` MUST run last (substring constraint)
- [x] **UPGR-05**: npm dist-tag version resolution for `@qwik.dev/*` packages
- [x] **UPGR-06**: Gitignore-respected file traversal via `visitNotIgnoredFiles`
- [x] **UPGR-07**: Binary file detection skip during text replacement
- [x] **UPGR-08**: ts-morph NOT in final package.json after migration (idempotency: preserve if pre-existing)
- [x] **UPGR-09**: Exit 0 on user cancel (cancellation is not an error)
- [x] **UPGR-10**: User confirmation prompt before destructive migration begins

### Check-Client Command

- [ ] **CHKC-01**: No dist directory → run `build.client` script
- [ ] **CHKC-02**: No `q-manifest.json` → run `build.client` script
- [ ] **CHKC-03**: Stale src (src files newer than manifest) → run `build.client` script
- [ ] **CHKC-04**: Up-to-date manifest → silent success (no output), exit 0
- [ ] **CHKC-05**: Fully non-interactive; usable in git hooks and CI

### Simple Commands

- [x] **SIMP-01**: `qwik version` outputs bare semver string (one line, no label prefix)
- [x] **SIMP-02**: `qwik joke` outputs setup + punchline, exit 0, no file writes or installs
- [x] **SIMP-03**: `qwik help` displays all commands with descriptions
- [x] **SIMP-04**: Jokes array is static data within CLI package (no cross-package import)

### Create-Qwik

- [ ] **CRQW-01**: `create-qwik` binary entry point for project scaffolding
- [ ] **CRQW-02**: Interactive flow: starter selection → project name → package manager → install deps
- [ ] **CRQW-03**: Non-interactive mode: `create-qwik <starter> <outDir>` with all defaults
- [ ] **CRQW-04**: Base layer merge: `base` starter provides devDependencies, chosen starter overlays
- [ ] **CRQW-05**: Library starter special path: no base layer merge (LIBRARY_ID branch)
- [ ] **CRQW-06**: `cleanPackageJson()` removes `__qwik__` metadata from output package.json
- [ ] **CRQW-07**: Background dependency install during interactive prompts
- [ ] **CRQW-08**: Success output with next-steps instructions

### Packaging

- [ ] **PKG-01**: Published as `@qwik.dev/cli` on npm with own release cycle
- [ ] **PKG-02**: `qwik` binary registered in package.json bin field
- [ ] **PKG-03**: `create-qwik` binary registered (same or separate package)
- [ ] **PKG-04**: ESM + CJS dual output verified in package.json exports

## v1.1 Requirements

Requirements for milestone v1.1: Course Correction & Completeness.

### Starters & Content

- [ ] **STRT-01**: User can run `qwik add` and see all 14 deployment adapters as options
- [ ] **STRT-02**: User can run `qwik add` and see all 22 feature integrations as options
- [ ] **STRT-03**: Stubs/apps contains all 4 app starters (base, empty, playground, library) with correct `__qwik__` metadata
- [ ] **STRT-04**: Top-level `adapters/` directory is removed from the repository
- [ ] **STRT-05**: `npm pack --dry-run` includes all starters content in the tarball

### Migration Architecture

- [ ] **MIGR-01**: Migration code lives in `migrations/v2/` scoped folder (not flat `src/migrate/`)
- [ ] **MIGR-02**: `upgrade` command checks and installs latest Qwik dependencies
- [ ] **MIGR-03**: `upgrade` command detects current Qwik version from package.json and chains all necessary migrations (v1→v2→v3→vN) sequentially
- [ ] **MIGR-04**: Each version migration is self-contained in its own `migrations/vN/` folder
- [ ] **MIGR-05**: Running upgrade on an already-current project is a clean no-op

### create-qwik

- [ ] **CRQW-09**: User can run `create-qwik base ./my-app` non-interactively to scaffold a project
- [ ] **CRQW-10**: User can run `create-qwik` interactively with guided 6-step flow (starter, name, PM, install, git init)
- [ ] **CRQW-11**: Dependencies install in the background while user answers remaining prompts
- [ ] **CRQW-12**: `create-qwik` removes `__qwik__` metadata from generated package.json
- [ ] **CRQW-13**: `create-qwik` initializes git repo with initial commit on new projects
- [ ] **CRQW-14**: `bin/create-qwik.ts` entry point works as standalone `npm create qwik` binary

### Tooling & Quality

- [ ] **TOOL-01**: Project uses vite-plus as unified toolchain (oxfmt, oxlint, vitest, tsdown)
- [ ] **TOOL-02**: Single `vite.config.ts` configures formatting, linting, and testing
- [x] **TOOL-03**: `tsc --noEmit` passes with zero errors across all source files
- [ ] **TOOL-04**: `qwik joke` draws from the real 30-joke pool from the Qwik repo
- [ ] **TOOL-05**: `biome.json` is removed and no Biome dependency remains
- [x] **TOOL-06**: All regex patterns replaced with magic-regexp for readability and type-safety

### Testing

- [ ] **VTST-01**: Vitest configured via vite-plus for unit testing alongside existing Japa integration tests
- [ ] **VTST-02**: Migration chaining logic has unit tests (version detection, chain building, sequential execution)
- [ ] **VTST-03**: create-qwik `createApp()` core logic has unit tests (template resolution, package.json cleanup, directory scaffolding)
- [ ] **VTST-04**: `loadIntegrations()` has unit tests verifying discovery of all starter types (apps, adapters, features)
- [ ] **VTST-05**: Existing Japa golden-path tests remain green after all restructuring

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced UX

- **UX-01**: `qwik --version` flag as alias for `qwik version` subcommand
- **UX-02**: `qwik upgrade` shown in help output (currently `showInHelp: false`)
- **UX-03**: Short flag support (`-s` for `--skipConfirmation`, etc.)

### Extended Surface

- **EXT-01**: New commands beyond the 9-command surface
- **EXT-02**: Plugin system for third-party command extensions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Qwik framework internals | This is CLI tooling only — framework code stays in @qwik.dev/core |
| Backward compatibility with monorepo import paths | Clean break; standalone package with own module resolution |
| GUI or web-based interface | Terminal CLI only; playground/Stackblitz serve the browser use case |
| Removing ASCII art logo (printHeader) | MAY CHANGE but deferred to v2; users/scripts may depend on output format |
| Uncommenting updateConfigurations() in migrate-v2 | Requires investigation per OQ-03; do not uncomment speculatively |
| Changing migrate-v2 from process.cwd() to app.rootDir | INVESTIGATE item per OQ-02; preserve existing behavior for v1 |
| Short flags (-n, -v, -s) | Current CLI has zero short flags; adding before parity proven creates ambiguity risk |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAF-01 | Phase 1 | Complete |
| SCAF-02 | Phase 1 | Complete |
| SCAF-03 | Phase 1 | Complete |
| SCAF-04 | Phase 1 | Complete |
| SCAF-05 | Phase 1 | Complete |
| SCAF-06 | Phase 1 | Complete |
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| ARCH-04 | Phase 1 | Complete |
| ARCH-05 | Phase 1 | Complete |
| ARCH-06 | Phase 3 | Complete |
| ARCH-07 | Phase 1 | Complete |
| ARCH-08 | Phase 1 | Complete |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 2 | Complete |
| TEST-03 | Phase 2 | Complete |
| TEST-04 | Phase 2 | Complete |
| BUILD-01 | Phase 4 | Complete |
| BUILD-02 | Phase 4 | Complete |
| BUILD-03 | Phase 4 | Complete |
| BUILD-04 | Phase 4 | Complete |
| BUILD-05 | Phase 4 | Complete |
| BUILD-06 | Phase 4 | Complete |
| BUILD-07 | Phase 4 | Complete |
| NEW-01 | Phase 4 | Complete |
| NEW-02 | Phase 4 | Complete |
| NEW-03 | Phase 4 | Complete |
| NEW-04 | Phase 4 | Complete |
| NEW-05 | Phase 4 | Complete |
| NEW-06 | Phase 4 | Complete |
| NEW-07 | Phase 4 | Complete |
| NEW-08 | Phase 4 | Complete |
| NEW-09 | Phase 4 | Complete |
| ADD-01 | Phase 5 | Complete |
| ADD-02 | Phase 5 | Complete |
| ADD-03 | Phase 5 | Complete |
| ADD-04 | Phase 5 | Complete |
| ADD-05 | Phase 5 | Complete |
| ADD-06 | Phase 5 | Complete |
| ADD-07 | Phase 5 | Complete |
| ADD-08 | Phase 5 | Complete |
| ADD-09 | Phase 5 | Complete |
| UPGR-01 | Phase 5 | Complete |
| UPGR-02 | Phase 5 | Complete |
| UPGR-03 | Phase 5 | Complete |
| UPGR-04 | Phase 5 | Complete |
| UPGR-05 | Phase 5 | Complete |
| UPGR-06 | Phase 5 | Complete |
| UPGR-07 | Phase 5 | Complete |
| UPGR-08 | Phase 5 | Complete |
| UPGR-09 | Phase 5 | Complete |
| UPGR-10 | Phase 5 | Complete |
| CHKC-01 | Phase 6 | Pending |
| CHKC-02 | Phase 6 | Pending |
| CHKC-03 | Phase 6 | Pending |
| CHKC-04 | Phase 6 | Pending |
| CHKC-05 | Phase 6 | Pending |
| SIMP-01 | Phase 3 | Complete |
| SIMP-02 | Phase 3 | Complete |
| SIMP-03 | Phase 3 | Complete |
| SIMP-04 | Phase 3 | Complete |
| CRQW-01 | Phase 6 | Pending |
| CRQW-02 | Phase 6 | Pending |
| CRQW-03 | Phase 6 | Pending |
| CRQW-04 | Phase 6 | Pending |
| CRQW-05 | Phase 6 | Pending |
| CRQW-06 | Phase 6 | Pending |
| CRQW-07 | Phase 6 | Pending |
| CRQW-08 | Phase 6 | Pending |
| PKG-01 | Phase 6 | Pending |
| PKG-02 | Phase 6 | Pending |
| PKG-03 | Phase 6 | Pending |
| PKG-04 | Phase 6 | Pending |
| STRT-01 | Phase 8 | Pending |
| STRT-02 | Phase 8 | Pending |
| STRT-03 | Phase 8 | Pending |
| STRT-04 | Phase 8 | Pending |
| STRT-05 | Phase 8 | Pending |
| MIGR-01 | Phase 9 | Pending |
| MIGR-02 | Phase 9 | Pending |
| MIGR-03 | Phase 9 | Pending |
| MIGR-04 | Phase 9 | Pending |
| MIGR-05 | Phase 9 | Pending |
| CRQW-09 | Phase 11 | Pending |
| CRQW-10 | Phase 11 | Pending |
| CRQW-11 | Phase 11 | Pending |
| CRQW-12 | Phase 11 | Pending |
| CRQW-13 | Phase 11 | Pending |
| CRQW-14 | Phase 11 | Pending |
| TOOL-01 | Phase 10 | Pending |
| TOOL-02 | Phase 10 | Pending |
| TOOL-03 | Phase 7 | Complete |
| TOOL-06 | Phase 7 | Complete |
| TOOL-04 | Phase 8 | Pending |
| TOOL-05 | Phase 10 | Pending |
| VTST-01 | Phase 10 | Pending |
| VTST-02 | Phase 9 | Pending |
| VTST-03 | Phase 11 | Pending |
| VTST-04 | Phase 11 | Pending |
| VTST-05 | Phase 11 | Pending |

**Coverage:**
- v1 requirements: 74 total
- Mapped to phases: 74
- Unmapped: 0
- v1.1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-02 — v1.1 traceability added (phases 7-11; 26 requirements mapped)*
