# CLI Behavioral Parity Test Plan

**Version:** 1.0
**Phase:** 09 — Parity Test Plan and Open Questions
**Plan:** 09-01
**Date:** 2026-04-02

---

## 1. Purpose and Scope

This document specifies the fixture projects and golden-path test scenarios a future test suite must exercise to prove behavioral parity for the Qwik CLI before or after any extraction or rewrite. It is derived from phases 5–8 of the v3.0 CLI Behavioral Parity Spec: the Command Inventory and Compatibility Contract (phase 05), the create-qwik behavioral spec (phase 06), the migrate-v2 behavioral spec (phase 07), and the starter/adapter/assets coupling report (phase 08). This document does not specify test framework or test runner — those are implementation decisions to be made when IMPL-03 is executed. An engineer implementing CLI tests after extraction must be able to read this document and know (a) which fixture projects to create, (b) which command invocations to test against each fixture, (c) what the expected output or side effect is for each scenario, and (d) where existing e2e tests already provide coverage versus where gaps remain.

---

## 2. Fixture Projects

A fixture project is a minimal project structure that allows a specific CLI command to be exercised in isolation. Each fixture is identified by an ID, described by name, specified by its minimum required contents, scoped to its purpose, and traced to a source spec document.

### FX-01: Minimal Qwik v2 App

**Minimum contents:**

- `package.json` declaring `@qwik.dev/core` and `@qwik.dev/router` as dependencies
- `package.json` with scripts: `build.client`, `build.server`, `build.preview`
- `src/routes/` directory (may be empty)
- `vite.config.ts`

**Purpose:** `qwik add`, `qwik build`, `qwik build preview`, `qwik check-client`. This is the baseline fixture for all command-level parity tests that require a valid v2 project.

**Source reference:** COMPATIBILITY-CONTRACT.md §add, §build, §check-client

---

### FX-02: v1 Qwik Project for Migration

**Minimum contents:**

- `package.json` declaring `@qwik.dev/core` and `@qwik.dev/router` as dependencies (no ts-morph in any dependency section)
- Source files containing `import { component$ } from '@qwik.dev/core'`
- Source files containing `import { routeLoader$ } from '@qwik.dev/router'`
- `.gitignore` file (so gitignore-respected traversal is exercised)
- `dist/` directory listed in `.gitignore`

**Purpose:** `qwik migrate-v2` full migration golden path (MIG-01, MIG-02, MIG-04, MIG-05). Provides the base v1 project that all migration scenarios run against.

**Source reference:** MIG-DEPS-AND-UPGRADE.md Part 4; COMPATIBILITY-CONTRACT.md §migrate-v2

---

### FX-03: v1 Project with ts-morph Already Present

**Minimum contents:**

- All contents of FX-02
- `ts-morph` listed in `devDependencies` in `package.json`

**Purpose:** `qwik migrate-v2` ts-morph idempotency guard scenario (MIG-03). Verifies that migration does not remove a user's pre-existing ts-morph dependency.

**Source reference:** MIG-DEPS-AND-UPGRADE.md Part 1

---

### FX-04: Empty Project (No Routes, No Components)

**Minimum contents:**

- `package.json` (any valid package)
- `src/` directory (empty or with non-route/non-component files)
- No files under `src/routes/`
- No files under `src/components/`

**Purpose:** `qwik new` — path/component creation scenarios (NEW-01, NEW-02, NEW-03, NEW-05). Provides a clean slate for verifying file generation and directory creation.

**Source reference:** COMPATIBILITY-CONTRACT.md §new

---

### FX-05: Project with Existing Component and Route (Duplicate Guard)

**Minimum contents:**

- All contents of FX-04
- `src/routes/dashboard/index.tsx` (existing route)
- `src/components/TestComponent.tsx` (existing component)

**Purpose:** `qwik new` duplicate file guard scenario (NEW-04). Verifies that attempting to create a file that already exists throws the correct error.

**Source reference:** COMPATIBILITY-CONTRACT.md §new — "Duplicate file guard — throws `"${filename}" already exists in "${outDir}"`"

---

### FX-06: Built Project with dist/ and q-manifest.json

**Minimum contents:**

- All contents of FX-01
- `dist/` directory containing `q-manifest.json`
- `q-manifest.json` mtime older than all files under `src/` (for stale test variant)
- `q-manifest.json` mtime newer than all files under `src/` (for up-to-date test variant; achieved by touching the manifest after build)

**Purpose:** `qwik check-client` "up to date" branch (CHK-02) and "stale src" branch (CHK-03). The fixture must be duplicated or mutated per scenario to control manifest mtime vs. src mtime.

**Source reference:** COMPATIBILITY-CONTRACT.md §check-client — "stale src → build; else no-op"; "Silent success (no output) when client is up to date"

---

### FX-07: Scaffolded Empty Starter

**Minimum contents:**

- Produced by running `create-qwik empty <outDir>` non-interactively (does not exist prior to test; created by the test itself)
- After scaffolding: `package.json` with `@qwik.dev/core` and `@qwik.dev/router`; `src/routes/` directory; node_modules installed

**Purpose:** CRE-01. Verify that the empty starter generates a valid v2 project structure. Also serves as the base for `qwik add` integration verification into a freshly scaffolded project.

**Source reference:** Phase 06 create-qwik behavioral spec (SCAFFOLD-FLOW.md)

---

### FX-08: Scaffolded Library Starter

**Minimum contents:**

- Produced by running `create-qwik library <outDir>` non-interactively (does not exist prior to test; created by the test itself)
- After scaffolding: library starter structure with no base layer merge (library is its own baseApp); `isLibrary` flag is implicit in the LIBRARY_ID branch of templateManager.ts

**Purpose:** CRE-02. Verify the library starter special path where `getBootstrapApps()` returns `baseApp=libApp` with no `starterApp`, skipping the base layer merge entirely.

**Source reference:** COMPATIBILITY-CONTRACT.md §create-qwik (via phase 06); Phase 06 decisions — "Library starter uses itself as baseApp with no starterApp — LIBRARY_ID branch in templateManager.ts returns baseApp=library with no starterApp key"

---

## 3. Command Parity Scenarios

For each CLI command, the following tables specify the golden-path scenarios a test suite must exercise. Every scenario is traceable to a source spec document. No behavior is invented — each expected outcome is derived from the source document cited.

### 3.1 `qwik add`

| ID     | Invocation                                                 | Fixture                  | Expected outcome                                                                                                    | Source                         |
| ------ | ---------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| ADD-01 | `qwik add cloudflare-pages --skipConfirmation=true`        | FX-01                    | Exit 0; adapter files written to project; integration's `postInstall` hook executed if present; `installDeps()` run | COMPATIBILITY-CONTRACT.md §add |
| ADD-02 | `qwik add --projectDir=./sub --skipConfirmation=true`      | FX-01 (with sub/ subdir) | Exit 0; files written to `./sub/`, not project root                                                                 | COMPATIBILITY-CONTRACT.md §add |
| ADD-03 | `qwik add nonexistent-integration --skipConfirmation=true` | FX-01                    | Exit 1 (file-write failure or unknown integration)                                                                  | COMPATIBILITY-CONTRACT.md §add |

### 3.2 `qwik build`

| ID       | Invocation                                        | Fixture                                          | Expected outcome                                                                                                         | Source                           |
| -------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| BUILD-01 | `qwik build`                                      | FX-01                                            | Exit 0; `build.client` runs first (sequential); `build.server`/`build.types`/`lint` run in parallel after                | COMPATIBILITY-CONTRACT.md §build |
| BUILD-02 | `qwik build preview`                              | FX-01                                            | Exit 0; `build.preview` triggered instead of `build.server`; distinction is `args.includes('preview')` predicate         | COMPATIBILITY-CONTRACT.md §build |
| BUILD-03 | `qwik build --mode staging`                       | FX-01                                            | Exit 0; `--mode staging` forwarded to `build.client` and other build scripts                                             | COMPATIBILITY-CONTRACT.md §build |
| BUILD-04 | `qwik build` (with failing `build.server` script) | FX-01 (mutated to have a failing `build.server`) | `process.exitCode` set to 1; parallel steps still complete (non-throw behavior — does not short-circuit sibling scripts) | COMPATIBILITY-CONTRACT.md §build |

### 3.3 `qwik new`

| ID     | Invocation                    | Fixture                                              | Expected outcome                                                                                                        | Source                                                                       |
| ------ | ----------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| NEW-01 | `qwik new /dashboard`         | FX-04                                                | `src/routes/dashboard/index.tsx` created; `[slug]`=`dashboard`, `[name]`=`Dashboard`; default template `qwik` applied   | COMPATIBILITY-CONTRACT.md §new                                               |
| NEW-02 | `qwik new counter`            | FX-04                                                | `src/components/counter.tsx` created (no leading `/` → component path, not route path)                                  | COMPATIBILITY-CONTRACT.md §new                                               |
| NEW-03 | `qwik new /blog/post.md`      | FX-04                                                | `src/routes/blog/post.md` created (markdown route)                                                                      | COMPATIBILITY-CONTRACT.md §new                                               |
| NEW-04 | `qwik new /dashboard`         | FX-05 (already has `src/routes/dashboard/index.tsx`) | Throws error `"index.tsx" already exists in "src/routes/dashboard/"`                                                    | COMPATIBILITY-CONTRACT.md §new — "Duplicate file guard"                      |
| NEW-05 | `qwik new /nested/deep/route` | FX-04                                                | `src/routes/nested/deep/route/index.tsx` created; `mkdirSync` with `{ recursive: true }` creates all parent directories | COMPATIBILITY-CONTRACT.md §new — `fs.mkdirSync(outDir, { recursive: true })` |

### 3.4 `qwik migrate-v2` (Golden Paths)

| ID     | Invocation                                     | Fixture                                     | Expected outcome                                                                                                                                                                                               | Source                                                                                |
| ------ | ---------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| MIG-01 | `qwik migrate-v2` (user confirms yes)          | FX-02                                       | All 5 steps complete in order; imports rewritten in 3 rounds (8 rename mappings total); packages renamed in all source files; ts-morph NOT in final package.json; `@qwik.dev/*` versions updated; exit 0       | MIG-DEPS-AND-UPGRADE.md Part 4                                                        |
| MIG-02 | `qwik migrate-v2` (user cancels / confirms no) | FX-02                                       | No files modified; exit 0 (cancellation is not an error — changing to exit 1 would break user scripts)                                                                                                         | COMPATIBILITY-CONTRACT.md §migrate-v2 — "Exit code 0 on user cancel is MUST PRESERVE" |
| MIG-03 | `qwik migrate-v2` (user confirms yes)          | FX-03 (ts-morph already in devDependencies) | ts-morph remains in devDependencies after migration; NOT removed by `removeTsMorphFromPackageJson` (idempotency guard)                                                                                         | MIG-DEPS-AND-UPGRADE.md Part 1                                                        |
| MIG-04 | `qwik migrate-v2` (user confirms yes)          | FX-02                                       | Files containing `@qwik.dev/router` are rewritten to `@qwik.dev/router`; NO file contains `@qwik.dev/core-city` after migration — proves `@qwik.dev/core` replacement ran LAST (substring ordering constraint) | COMPATIBILITY-CONTRACT.md §migrate-v2 — ordering constraint                           |
| MIG-05 | `qwik migrate-v2` (user confirms yes)          | FX-02 (with `dist/` in `.gitignore`)        | Files under `dist/` are NOT modified — gitignore-respected traversal via `visitNotIgnoredFiles`                                                                                                                | COMPATIBILITY-CONTRACT.md §migrate-v2 — gitignore-respected traversal                 |

### 3.5 `qwik check-client`

| ID     | Invocation                   | Fixture                                            | Expected outcome                                              | Source                                                                                           |
| ------ | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CHK-01 | `qwik check-client src dist` | FX-01 (no `dist/` directory)                       | `build.client` script runs; exit 0 on success                 | COMPATIBILITY-CONTRACT.md §check-client — "no dist dir → build"                                  |
| CHK-02 | `qwik check-client src dist` | FX-06 (fresh `dist/` with manifest newer than src) | No build triggered; silent success (no stdout output); exit 0 | COMPATIBILITY-CONTRACT.md §check-client — "Silent success (no output) when client is up to date" |
| CHK-03 | `qwik check-client src dist` | FX-06 (src files newer than `q-manifest.json`)     | `build.client` runs (stale src branch); exit 0 on success     | COMPATIBILITY-CONTRACT.md §check-client — "stale src → build"                                    |

### 3.6 `qwik version`

| ID     | Invocation     | Fixture | Expected outcome                                                                                                                | Source                                                                                                                         |
| ------ | -------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| VER-01 | `qwik version` | any     | stdout contains exactly one line; line is a valid semver string with no label prefix (e.g., `2.0.0`, not `qwik version: 2.0.0`) | COMPATIBILITY-CONTRACT.md §version — "Bare semver string output (no label prefix) is MUST PRESERVE — parsers depend on format" |

### 3.7 `qwik joke`

| ID      | Invocation  | Fixture | Expected outcome                                                                                                                  | Source                          |
| ------- | ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| JOKE-01 | `qwik joke` | any     | Exit 0 (normal return; no `process.exit` call); no file writes; no package installs; stdout contains a setup line and a punchline | COMPATIBILITY-CONTRACT.md §joke |

### 3.8 `create-qwik` Scaffolding (Starter/Adapter Flow Parity)

| ID     | Invocation                        | Fixture              | Expected outcome                                                                                                                                                               | Source                                                                 |
| ------ | --------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| CRE-01 | `create-qwik empty <outDir>`      | none — creates FX-07 | `package.json` contains `@qwik.dev/core` and `@qwik.dev/router`; `src/routes/` directory exists; node_modules installed; no base layer merge artifacts from wrong starter path | Phase 06 spec (SCAFFOLD-FLOW.md)                                       |
| CRE-02 | `create-qwik library <outDir>`    | none — creates FX-08 | Library starter structure; no base layer merge (`getBootstrapApps()` returns `baseApp=libApp` with no `starterApp`); LIBRARY_ID branch taken                                   | Phase 06 spec (SCAFFOLD-FLOW.md) — "Library starter is self-contained" |
| CRE-03 | `create-qwik playground <outDir>` | none                 | Counter component at `src/components/starter/counter/counter.tsx`; dev server starts and HMR preserves state after file modification                                           | `e2e/qwik-cli-e2e/tests/serve.spec.ts` (COVERED — existing test)       |

---

## 4. Existing e2e/qwik-cli-e2e/ Coverage Analysis

### 4.1 What Is Covered

The only test file in `e2e/qwik-cli-e2e/tests/` is `serve.spec.ts`. It covers the following:

| What                                       | How                                                    | Verdict                                                       |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------- |
| `create-qwik playground <dir>` scaffolding | `runCreateQwikCommand()` via `execSync`                | COVERED                                                       |
| `create-qwik empty <dir>` scaffolding      | `runCreateQwikCommand()` via `execSync`                | COVERED                                                       |
| `npm run dev` (dev server startup + HMR)   | `runCommandUntil` + Playwright browser interaction     | COVERED (playground only)                                     |
| `npm run build` (indirectly)               | `runCommandUntil('npm run build')` inside preview test | PARTIALLY COVERED — success path only; no exit code assertion |
| `npm run preview` (preview server startup) | `runCommandUntil` + HTTP response text assertion       | COVERED                                                       |
| library starter scaffolding                | `scaffoldQwikProject('library')` exists in test utils  | SCAFFOLDING ONLY — no test currently exercises this fixture   |

### 4.2 Gap Analysis

The following commands have zero direct test coverage in `e2e/qwik-cli-e2e/`:

| Command                     | Gaps                                                                                                                               | Risk Level                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `qwik add`                  | All scenarios — no test for `--skipConfirmation`, `--projectDir`, `postInstall` hook, exit codes 0/1                               | HIGH — primary integration installation mechanism  |
| `qwik build`                | No direct `qwik build` binary invocation; no `--mode` flag test; no prebuild/postbuild hook test; no exit code 1 on script failure | HIGH — core build orchestration logic              |
| `qwik new`                  | No test for any `qwik new` subcommand variant (route, component, markdown, nested, duplicate guard)                                | MEDIUM — route/component generation                |
| `qwik migrate-v2`           | No test — entire 5-step migration flow is untested including ordering constraint, gitignore traversal, ts-morph idempotency        | CRITICAL — destructive file mutation               |
| `qwik check-client`         | No test — three-branch decision tree (no-dist / stale / up-to-date) is untested; manifest mtime logic unverified                   | MEDIUM — used in git hooks and CI pipelines        |
| `qwik version`              | No test — bare semver output format not verified; parser regressions would be silent                                               | LOW — format is relied upon by downstream parsers  |
| `qwik joke`                 | No test                                                                                                                            | LOW                                                |
| Non-interactive flags       | `--skipConfirmation`, `--projectDir`, `--mode` — none are directly tested                                                          | HIGH — these flags are the CI-safe invocation path |
| Exit code contracts         | Only implicit (non-zero exit causes test runner to fail); no explicit assertions                                                   | HIGH — broken exit codes could silently pass       |
| library starter dev/preview | Scaffolded in utils (`scaffoldQwikProject('library')`) but no test exercises the resulting project                                 | MEDIUM                                             |

### 4.3 Coverage Percentage

By command surface area (9 commands in scope: `add`, `build`, `new`, `migrate-v2`, `check-client`, `version`, `joke`, `create-qwik`, `help/version`):

- Directly tested by `serve.spec.ts`: 0 `qwik` CLI binary commands
- Indirectly exercised: `create-qwik` scaffolding for 2 of 3 starters (playground, empty); `npm run build` exercised without exit code assertion
- Behavioral parity coverage: approximately 5% of MUST PRESERVE behaviors from COMPATIBILITY-CONTRACT.md (only the scaffold + dev/preview flow)

Note: `serve.spec.ts` tests `npm run dev`, `npm run build`, and `npm run preview` — these are npm script invocations on the generated project, not `qwik` binary command invocations. They do not verify any behavior listed in COMPATIBILITY-CONTRACT.md §add, §build, §new, §migrate-v2, §check-client, §version, or §joke.

---

## 5. Test Scope for TST Requirement Coverage

This section maps scenarios from Section 3 to the four TST requirements this plan must satisfy.

| Requirement | Description                                        | Scenarios Covered                                                                                                                               | Fixture(s) Needed                            |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| TST-01      | Command-level behavioral parity fixtures           | ADD-01, ADD-02, ADD-03, BUILD-01, BUILD-02, BUILD-03, BUILD-04, NEW-01, NEW-02, NEW-03, NEW-04, NEW-05, CHK-01, CHK-02, CHK-03, VER-01, JOKE-01 | FX-01, FX-04, FX-05, FX-06                   |
| TST-02      | Migration parity golden-path scenarios             | MIG-01, MIG-02, MIG-03, MIG-04, MIG-05                                                                                                          | FX-02, FX-03                                 |
| TST-03      | Starter/adapter flow parity fixtures               | CRE-01, CRE-02, CRE-03                                                                                                                          | None (create-qwik generates FX-07 and FX-08) |
| TST-04      | e2e gap analysis — what exists vs. what is missing | Section 4 of this document (coverage table + gap table + percentage)                                                                            | n/a (analysis artifact, not executable test) |

---

## 6. Out of Scope

The following decisions are explicitly deferred to IMPL-03 (test suite implementation):

- Test framework selection (Vitest, Playwright, shell scripts, or combination)
- Test runner configuration and CI integration specifics
- Exact assertion syntax and test helper library
- Performance or load testing
- Fixture provisioning strategy (checked-in templates vs. generated at test time)
- Test isolation and parallelism strategy

---

## Verified Against

| Item                    | Detail                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Branch                  | `build/v2`                                                                               |
| Source spec — commands  | `.planning/phases/05-command-inventory-compatibility-contract/COMPATIBILITY-CONTRACT.md` |
| Source spec — migration | `.planning/phases/07-migrate-v2-behavioral-spec/MIG-DEPS-AND-UPGRADE.md`                 |
| Source spec — starters  | `.planning/phases/08-starter-adapter-assets-coupling-report/COUPLING-REPORT.md`          |
| Existing e2e tests      | `e2e/qwik-cli-e2e/tests/serve.spec.ts` (only test file in that directory)                |
| Requirement IDs         | TST-01, TST-02, TST-03, TST-04                                                           |
