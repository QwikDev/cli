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
- [ ] **ARCH-06**: Package manager auto-detection via which-pm-runs with pnpm fallback
- [x] **ARCH-07**: `bye()` (outro + exit 0) and `panic()` (error + exit 1) exit helpers
- [x] **ARCH-08**: Unrecognized command handling: red error message + print help + exit 1

### Test Harness

- [x] **TEST-01**: 6 static fixture projects (FX-01 through FX-06) created per PARITY-TEST-PLAN.md; FX-07 and FX-08 are runtime outputs of create-qwik tests (CRE-01, CRE-02) produced in Phase 6
- [ ] **TEST-02**: 25 golden-path test scenarios encoded as Japa tests (spec-first, before implementation)
- [ ] **TEST-03**: Exit code assertions on every command test (0 for success/cancel, 1 for error)
- [x] **TEST-04**: Fixture mutation helpers for mtime manipulation (check-client scenarios)

### Build Command

- [ ] **BUILD-01**: `qwik build` runs `build.client` sequentially first, then `build.server`/`build.types`/`lint` in parallel
- [ ] **BUILD-02**: `qwik build preview` triggers `build.preview` instead of `build.server`
- [ ] **BUILD-03**: `--mode <value>` forwarded to `build.client`, `build.lib`, `build.preview`, `build.server`
- [ ] **BUILD-04**: `prebuild.*` scripts discovered and run sequentially BEFORE parallel build
- [ ] **BUILD-05**: `postbuild.*` scripts discovered and run sequentially AFTER parallel build
- [ ] **BUILD-06**: `process.exitCode = 1` on any script failure (non-throw, allows parallel steps to finish)
- [ ] **BUILD-07**: `ssg` script runs after `build.static` in preview mode when both present

### New Command

- [ ] **NEW-01**: `qwik new /path` creates route in `src/routes/` with `[slug]`/`[name]` token substitution
- [ ] **NEW-02**: `qwik new name` (no leading `/`) creates component in `src/components/`
- [ ] **NEW-03**: `qwik new /path.md` and `/path.mdx` create markdown/MDX routes
- [ ] **NEW-04**: Duplicate file guard throws `"${filename}" already exists in "${outDir}"`
- [ ] **NEW-05**: `--<templateId>` flag selects template; default template `qwik` when positional given
- [ ] **NEW-06**: Auto-select template when exactly 1 template found (no prompt)
- [ ] **NEW-07**: `fs.mkdirSync(outDir, { recursive: true })` creates parent directories
- [ ] **NEW-08**: Interactive prompt flow: select type → text name → select template (each conditional)
- [ ] **NEW-09**: `parseInputName()` slug and PascalCase transformation; split on `[-_\s]` only

### Add Command

- [ ] **ADD-01**: `qwik add [integration-id]` positional argument selects integration
- [ ] **ADD-02**: `--skipConfirmation=true` flag bypasses user consent gate
- [ ] **ADD-03**: `--projectDir=<path>` flag writes files into specified subdirectory
- [ ] **ADD-04**: Interactive integration selection via @clack/prompts select when no positional
- [ ] **ADD-05**: Integration file writes committed only after user confirmation (or --skipConfirmation)
- [ ] **ADD-06**: `installDeps()` runs when integration adds dependencies
- [ ] **ADD-07**: `postInstall` script execution when `integration.pkgJson.__qwik__.postInstall` exists
- [ ] **ADD-08**: `loadIntegrations()` discovers integrations from `stubs/` directory
- [ ] **ADD-09**: Exit 0 on success, exit 1 on file-write or install failure

### Upgrade Command

- [ ] **UPGR-01**: `qwik migrate-v2` alias routes to upgrade command (ALIAS REQUIRED)
- [ ] **UPGR-02**: 5-step migration sequence executes in exact documented order
- [ ] **UPGR-03**: AST import renaming: 3 rounds, 8 mappings via oxc-parser + magic-string
- [ ] **UPGR-04**: Text-replacement `replacePackage()` × 5 calls — `@builder.io/qwik` MUST run last (substring constraint)
- [ ] **UPGR-05**: npm dist-tag version resolution for `@qwik.dev/*` packages
- [ ] **UPGR-06**: Gitignore-respected file traversal via `visitNotIgnoredFiles`
- [ ] **UPGR-07**: Binary file detection skip during text replacement
- [ ] **UPGR-08**: ts-morph NOT in final package.json after migration (idempotency: preserve if pre-existing)
- [ ] **UPGR-09**: Exit 0 on user cancel (cancellation is not an error)
- [ ] **UPGR-10**: User confirmation prompt before destructive migration begins

### Check-Client Command

- [ ] **CHKC-01**: No dist directory → run `build.client` script
- [ ] **CHKC-02**: No `q-manifest.json` → run `build.client` script
- [ ] **CHKC-03**: Stale src (src files newer than manifest) → run `build.client` script
- [ ] **CHKC-04**: Up-to-date manifest → silent success (no output), exit 0
- [ ] **CHKC-05**: Fully non-interactive; usable in git hooks and CI

### Simple Commands

- [ ] **SIMP-01**: `qwik version` outputs bare semver string (one line, no label prefix)
- [ ] **SIMP-02**: `qwik joke` outputs setup + punchline, exit 0, no file writes or installs
- [ ] **SIMP-03**: `qwik help` displays all commands with descriptions
- [ ] **SIMP-04**: Jokes array is static data within CLI package (no cross-package import)

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
| ARCH-06 | Phase 3 | Pending |
| ARCH-07 | Phase 1 | Complete |
| ARCH-08 | Phase 1 | Complete |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 2 | Pending |
| TEST-04 | Phase 2 | Complete |
| BUILD-01 | Phase 4 | Pending |
| BUILD-02 | Phase 4 | Pending |
| BUILD-03 | Phase 4 | Pending |
| BUILD-04 | Phase 4 | Pending |
| BUILD-05 | Phase 4 | Pending |
| BUILD-06 | Phase 4 | Pending |
| BUILD-07 | Phase 4 | Pending |
| NEW-01 | Phase 4 | Pending |
| NEW-02 | Phase 4 | Pending |
| NEW-03 | Phase 4 | Pending |
| NEW-04 | Phase 4 | Pending |
| NEW-05 | Phase 4 | Pending |
| NEW-06 | Phase 4 | Pending |
| NEW-07 | Phase 4 | Pending |
| NEW-08 | Phase 4 | Pending |
| NEW-09 | Phase 4 | Pending |
| ADD-01 | Phase 5 | Pending |
| ADD-02 | Phase 5 | Pending |
| ADD-03 | Phase 5 | Pending |
| ADD-04 | Phase 5 | Pending |
| ADD-05 | Phase 5 | Pending |
| ADD-06 | Phase 5 | Pending |
| ADD-07 | Phase 5 | Pending |
| ADD-08 | Phase 5 | Pending |
| ADD-09 | Phase 5 | Pending |
| UPGR-01 | Phase 5 | Pending |
| UPGR-02 | Phase 5 | Pending |
| UPGR-03 | Phase 5 | Pending |
| UPGR-04 | Phase 5 | Pending |
| UPGR-05 | Phase 5 | Pending |
| UPGR-06 | Phase 5 | Pending |
| UPGR-07 | Phase 5 | Pending |
| UPGR-08 | Phase 5 | Pending |
| UPGR-09 | Phase 5 | Pending |
| UPGR-10 | Phase 5 | Pending |
| CHKC-01 | Phase 6 | Pending |
| CHKC-02 | Phase 6 | Pending |
| CHKC-03 | Phase 6 | Pending |
| CHKC-04 | Phase 6 | Pending |
| CHKC-05 | Phase 6 | Pending |
| SIMP-01 | Phase 3 | Pending |
| SIMP-02 | Phase 3 | Pending |
| SIMP-03 | Phase 3 | Pending |
| SIMP-04 | Phase 3 | Pending |
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

**Coverage:**
- v1 requirements: 74 total
- Mapped to phases: 74
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 — TEST-01 clarified: 6 static fixtures (Phase 2) + 2 runtime outputs (Phase 6)*
