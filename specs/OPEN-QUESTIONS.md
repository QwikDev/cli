# Open Questions and Risks — v3.0 CLI Behavioral Parity Spec

This document consolidates every ambiguous, underspecified, or risky area discovered during
phases 5-8 of the v3.0 CLI Behavioral Parity Spec. Items are grouped by category and ranked by
severity. None of these items prevent the spec from being used as-is, but all of them must be
resolved before IMPL-01 (CLI extraction) or IMPL-02 (qwik upgrade implementation) begins.

The document is organized into two main categories: **Behavioral Open Questions** (decisions or
verifications required before rewrite) and **Extraction Blockers** (coupling that must be
remediated before the CLI can be packaged as a standalone module).

---

## Section 1: Classification Legend

| Label                 | Meaning                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| DECISION-REQUIRED     | A human must decide which behavior is correct before implementation can proceed                              |
| VERIFICATION-REQUIRED | A behavior must be tested against real inputs to determine what actually happens                             |
| REMEDIATION-REQUIRED  | A structural coupling must be resolved before extraction; the solution path is clear but not yet implemented |

---

## Section 2: Behavioral Open Questions

These are INVESTIGATE items from Phase 5 (COMPATIBILITY-CONTRACT.md §Open Questions) plus
behavioral risks from Phase 7 (MIG-DEPS-AND-UPGRADE.md). Each item must be resolved before the
IMPL-\* phase it blocks.

---

### OQ-01: Joke cross-package coupling

**Category:** DECISION-REQUIRED
**Source:** COMPATIBILITY-CONTRACT.md §Open Questions §1
**Risk:** `run-joke-command.ts` in `packages/qwik/src/cli/joke/` imports `getRandomJoke` from
`../../../../create-qwik/src/helpers/jokes` via a relative path that crosses package boundaries.
If `@qwik.dev/cli` becomes a standalone npm package, this import breaks at compile time — the
relative path resolves outside the package root.
**Decision needed:** Choose one of:
(a) Drop `joke` from the future CLI entirely.
(b) Move the jokes array into `packages/qwik/src/cli/joke/jokes.ts` as a static data file
(the `create-qwik` jokes path confirmed self-contained in Phase 8 — the data can be
duplicated without coupling).
(c) Declare `create-qwik` as an explicit runtime dependency of `@qwik.dev/cli`.
**Recommendation:** Option (b) — move jokes array inline to the CLI package. Zero runtime
dependency, no cross-package coupling, trivially easy to execute.
**Blocking:** IMPL-01

---

### OQ-02: migrate-v2 uses process.cwd() not app.rootDir

**Category:** VERIFICATION-REQUIRED
**Source:** COMPATIBILITY-CONTRACT.md §Open Questions §2; MIG-DEPS-AND-UPGRADE.md
§updateDependencies() TODO comment
**Risk:** All 5 migration steps use `process.cwd()` as the project root. Every other subcommand
uses `app.rootDir` (resolved by walking up from `process.cwd()` to the nearest `package.json`).
In a pnpm workspace monorepo where the user runs `qwik migrate-v2` from the repo root, the
migration may operate on the wrong directory or on a `package.json` that does not contain Qwik
dependencies. A `TODO` comment in `updateDependencies()` explicitly flags this:
`"// TODO(migrate-v2): rely on workspaceRoot instead?"`.
**Verification needed:** Run `qwik migrate-v2` from a pnpm workspace root (parent directory of
the actual Qwik app). Confirm whether it operates on the workspace root `package.json` or the
correct sub-package `package.json`. If `process.cwd()` behavior is intentional (simpler for
one-shot migrations), it is a MUST PRESERVE behavior. If it is a bug, fixing it changes
observable behavior and must be explicitly decided.
**Blocking:** IMPL-02

---

### OQ-03: updateConfigurations() commented out

**Category:** DECISION-REQUIRED
**Source:** COMPATIBILITY-CONTRACT.md §Open Questions §3
**Risk:** `run-migration.ts` contains a commented-out call to `updateConfigurations()` with the
note `"// COMMENTED OUT FOR NOW (as this is fixed in https://github.com/QwikDev/qwik/pull/7159)"`.
If PR #7159 fixed the configuration issue in the framework itself, `updateConfigurations()` is
dead code. If it was commented out as unfinished work, configuration migration is silently skipped
for all users running `qwik migrate-v2`. There is no runtime guard or warning.
**Decision needed:** What does `updateConfigurations()` do? Was the fix in PR #7159 sufficient
that no configuration file migration is needed? Are there edge cases — older v1 projects not
updated by the framework fix — that still require it?
**Recommendation:** Before shipping `@qwik.dev/cli`, verify that all configuration files a v1
project might have are correctly handled without this step. If any are not, re-implement the step
explicitly rather than uncommenting undocumented code.
**Blocking:** IMPL-02

---

### OQ-04: qwik version aliasing — subcommand vs --version flag

**Category:** VERIFICATION-REQUIRED
**Source:** COMPATIBILITY-CONTRACT.md §Open Questions §4; §Alias Requirements
**Risk:** `qwik version` is implemented as a registered subcommand, not a `--version` flag. IDE
extensions, language servers, and CI scripts may invoke either `qwik version` or `qwik --version`.
The v1 CLI spec confirms that `qwik version` outputs a bare semver string (no label prefix) — this
format is MUST PRESERVE because callers parse it. If a future CLI changes the invocation to
`--version` only and drops the subcommand form, existing callers using `qwik version` break
silently (command not found or wrong output).
**Verification needed:** Survey known consumers — VS Code Qwik extension, WebStorm plugin, any
official CI templates in starter kits. Determine which invocation form(s) each uses.
**Recommendation:** Support both `qwik version` (subcommand) and `qwik --version` (flag) in the
future CLI. Output must be identical: bare semver string, one line, no label.
**Blocking:** IMPL-01

---

### OQ-05: migrate-v2 hidden from help (showInHelp: false)

**Category:** DECISION-REQUIRED
**Source:** COMPATIBILITY-CONTRACT.md §Open Questions §5; §help table
**Risk:** `migrate-v2` is callable as `qwik migrate-v2` but is not listed in `qwik help` output
(`showInHelp: false`). It is unclear whether this was intentional — to prevent accidental runs,
given that migration is one-time and destructive — or an oversight. The command does show an
interactive confirmation prompt (`'Do you want to proceed?'`) before making any changes.
**Decision needed:** Should a future CLI expose `migrate-v2` / `qwik upgrade` in help output? The
existing confirmation prompt already guards against accidental execution, which may make hiding it
from help unnecessary.
**Recommendation:** Rename to `qwik upgrade` and show in help. The existing confirmation prompt
provides sufficient guard. Keeping it hidden reduces discoverability for legitimate users needing
to upgrade, while providing no meaningful safety benefit that the prompt does not already provide.
**Blocking:** IMPL-01, IMPL-02

---

### OQ-06: ts-morph global identifier rename scope risk

**Category:** VERIFICATION-REQUIRED
**Source:** STATE.md decisions — `[Phase 07-migrate-v2-behavioral-spec]: ts-morph global
identifier rename is not scoped to import declarations — local variables matching old import names
are also renamed (RISK)`
**Risk:** The ts-morph AST rename step in `run-rename-import.ts` renames all identifiers matching
old import names throughout each source file, not only within `import` declarations. A local
variable or function parameter named `component`, `jsx`, `jsxs`, or any other renamed export would
be renamed even if it has no relationship to the `@qwik.dev/core` import. This could produce
incorrect output that is syntactically valid but semantically wrong — hard to detect without
careful testing.
**Verification needed:** Test with a v1 project that has local variables sharing names with the
renamed identifiers (e.g., `const jsx = someOtherLib.jsx`, `const component = buildComponent()`).
Confirm whether ts-morph renames those variables and whether the output is incorrect.
**Blocking:** IMPL-02

---

### OQ-07: visitNotIgnoredFiles symlink traversal and missing .gitignore

**Category:** VERIFICATION-REQUIRED
**Source:** STATE.md decisions — `[Phase 07-migrate-v2-behavioral-spec]: visitNotIgnoredFiles
uses lstatSync — symlinks recurse as directories, not visited as files`; `[Phase
07-migrate-v2-behavioral-spec]: No .gitignore = ig undefined, all files visited including .git/
contents`
**Risk (a) — Symlink traversal:** `visitNotIgnoredFiles` uses `lstatSync` to determine whether an
entry is a directory. A symlink pointing to a directory causes `lstatSync` to report it as a
directory, so it is recursed into. If a project contains symlinks to external directories (e.g.,
linked node_modules, workspace symlinks, or shell-created test links), the migration descends into
and potentially modifies files outside the project root.
**Risk (b) — Missing .gitignore:** If there is no `.gitignore` at `process.cwd()`, the `ignore`
instance (`ig`) is `undefined`. The guard `ig?.ignores(relPath)` evaluates to `false` for every
file, meaning all files are visited — including `.git/` directory contents. Modifying `.git/`
internals (e.g., the `COMMIT_EDITMSG` or `HEAD` file) corrupts the repository.
**Verification needed:** Test with a project that has no `.gitignore`. Confirm whether `.git/`
contents are visited and whether the text-replace step would modify any of them.
**Blocking:** IMPL-02

---

## Section 3: Extraction Blockers

These are the coupling points from Phase 8 (COUPLING-REPORT.md) that must be resolved before
`create-qwik` can be extracted into an independently published package. Each item includes its
severity rating from the coupling report.

Items are ranked by severity: CRITICAL first, then SIGNIFICANT, MODERATE, and MINOR. Resolved
items (jokes.json, logSuccessFooter) are excluded — see Section 4.

---

### EB-01: loadIntegrations() \_\_dirname coupling

**Severity:** CRITICAL
**Source:** COUPLING-REPORT.md §Hidden Assumptions and Extraction Blockers §1
**Why it holds today:** esbuild `bundle: true` physically inlines `integrations.ts` into each
output file. `import.meta.url` reflects the bundle's location, so `starters/` is found at
`create-qwik/dist/starters/`. No runtime resolution is needed — the path is always correct
because bundling co-locates the code with the assets.
**What breaks on extraction:** If `create-qwik` imports `loadIntegrations` from a separately
installed `@qwik.dev/core` package (ESM import, not bundled), `import.meta.url` points to
`node_modules/@qwik.dev/core/dist/cli.mjs`. The `starters/` directory does not exist there.
Result: `loadIntegrations()` throws or returns an empty array; all starter selection is broken.
**Remediation options:**

- (A) Accept a `startersDir` parameter in `loadIntegrations()` — caller provides the resolved
  path. Simple API change, no structural rearrangement.
- (B) Move `loadIntegrations()` into create-qwik's own source. Clean but duplicates code.
- (C) Publish `starters/apps/` inside `@qwik.dev/core` dist alongside its existing starters.

---

### EB-02: starters/apps/ not in published @qwik.dev/core dist

**Severity:** CRITICAL
**Source:** COUPLING-REPORT.md §Hidden Assumptions and Extraction Blockers §2
**Why it holds today:** `scripts/create-qwik-cli.ts` copies `starters/apps/` into
`create-qwik/dist/`. `scripts/submodule-cli.ts` copies `starters/features/` and
`starters/adapters/` into `packages/qwik/dist/`. The two are never co-shipped — `apps/` exists
only in the create-qwik dist.
**What breaks on extraction:** A standalone create-qwik package that does not inline
`loadIntegrations()` (see EB-01) has no path to the `apps/` starters it needs, because they are
not shipped inside `@qwik.dev/core`.
**Remediation:** Co-ship `apps/` in `@qwik.dev/core` alongside existing `features/` and
`adapters/` starters, or move starters discovery entirely into create-qwik's own package
and build pipeline.

---

### EB-03: CODE_MOD global gates updateViteConfigs()

**Severity:** SIGNIFICANT
**Source:** COUPLING-REPORT.md §Hidden Assumptions and Extraction Blockers §3
**Why it holds today:** esbuild `define` replaces `(globalThis as any).CODE_MOD` with `false`
(create-qwik bundle) or `true` (qwik CLI bundle) at compile time. Each bundle has the correct
value baked in: create-qwik never calls `updateViteConfigs()` during scaffold; the qwik CLI always
does during `qwik add`.
**What breaks on extraction:** If `create-qwik` imports `updateApp` from a separately installed
`@qwik.dev/core`, the value of `CODE_MOD` is whatever was compiled into the core bundle —
`true`. `updateViteConfigs()` then runs during new project scaffolding, potentially corrupting
newly created vite configs by applying integration-specific vite transformations that are not
appropriate for initial project setup.
**Remediation:** Expose `CODE_MOD` as an explicit `opts.applyViteConfig?: boolean` parameter to
`updateApp()` instead of a build-time global. Callers explicitly opt in or out of vite config
mutation.

---

### EB-04: Shared type definitions

**Severity:** MODERATE
**Source:** COUPLING-REPORT.md §Hidden Assumptions and Extraction Blockers §4
**Types affected:** `IntegrationData`, `CreateAppResult`, `CreateAppOptions`, `IntegrationType`
— all defined in `packages/qwik/src/cli/types.ts` and imported by create-qwik via cross-package
paths.
**What breaks on extraction:** A version mismatch between the installed `@qwik.dev/core` and the
version create-qwik was originally compiled against could cause TypeScript type errors at
build time and silent interface mismatches at runtime if object shapes diverge.
**Remediation:** Extract shared types into a stable `@qwik.dev/cli-types` package that both
packages depend on, or duplicate the type definitions into create-qwik's own source (acceptable
if the types are simple and stable).

---

### EB-05: syncBaseStarterVersionsFromQwik() version sync

**Severity:** MODERATE
**Source:** COUPLING-REPORT.md §Hidden Assumptions and Extraction Blockers §5
**Why it holds today:** Both packages are built together from the same monorepo.
`scripts/create-qwik-cli.ts` reads the current qwik version at build time and bakes it into
`create-qwik/dist/starters/apps/base/package.json` as `devDependencies` pins. Scaffolded
projects always receive the current qwik version.
**What breaks on extraction:** If create-qwik is released on an independent cadence,
`base/package.json` devDependencies would be pinned to a stale qwik version. Scaffolded projects
would start with outdated Qwik packages, forcing users to immediately run an upgrade.
**Remediation:** Define a runtime version injection contract: create-qwik reads the version of the
installed `@qwik.dev/core` peer dependency at runtime and injects it during scaffolding, rather
than relying on a build-time baked value.

---

### EB-06: Import path form inconsistency

**Severity:** MINOR
**Source:** COUPLING-REPORT.md §Cross-Package Import Map — Import Path Form Inconsistency
**Description:** Two forms of cross-package imports coexist in create-qwik source files:
`'packages/qwik/src/cli/...'` (tsconfig alias form) and `'../../qwik/src/cli/...'` (relative
form). Both resolve to the same physical files today.
**What breaks on extraction:** Bulk replacement of the import boundary (to switch from
cross-package imports to a published package reference) requires grepping two distinct patterns.
Either form could also fail if the repo layout or tsconfig alias changes unexpectedly.
**Remediation:** Normalize all cross-package imports to a single canonical form before extraction.
This is a low-risk cleanup that reduces the surface area for extraction errors.

---

### EB-07: Undeclared runtime dependencies in create-qwik/package.json

**Severity:** MINOR
**Source:** COUPLING-REPORT.md §Hidden Assumptions and Extraction Blockers §8
**Packages affected:** `which-pm-runs`, `@clack/prompts` (listed only as devDependency),
`kleur` (listed only as devDependency). All three are used at runtime in create-qwik source files.
**Why it holds today:** esbuild `bundle: true` inlines all non-external packages into the output
file. Consumers install `create-qwik` and receive a single bundled file; they never need to
separately install `@clack/prompts` or `kleur`.
**What breaks on extraction:** Building create-qwik outside the monorepo (or in any environment
where esbuild cannot resolve devDependencies from the monorepo root) would fail to find these
packages. CI pipelines that install only `dependencies` (not `devDependencies`) would also fail.
**Remediation:** Declare all runtime-used packages as `dependencies` in `create-qwik/package.json`,
or document explicitly that create-qwik is monorepo-only buildable (not independently publishable
without the monorepo context).

---

## Section 4: Resolved Items

Items that were flagged as INVESTIGATE or ambiguous during earlier phases but were confirmed
resolved by the time phase 8 completed. Listed here to close the loop — do not re-open these.

| Item                                | Resolution                                                                                                                          | Source                                        |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| jokes.json coupling in create-qwik  | `create-qwik/src/helpers/jokes.ts` imports from local `./jokes.json` — self-contained within create-qwik; no cross-package coupling | COUPLING-REPORT.md §6 (Phase 8 investigation) |
| logSuccessFooter return value usage | Return value IS consumed via `outString.push(logSuccessFooter(...))` — no silent discard bug                                        | COUPLING-REPORT.md §Shared Helpers Catalog    |

**Note:** OQ-01 (joke coupling in the qwik CLI's own `run-joke-command.ts`) remains open — it is
a separate coupling from the create-qwik `jokes.json` path. The create-qwik coupling is resolved;
the qwik CLI coupling is not.

---

## Section 5: Pre-Implementation Checklist

An engineer must resolve or confirm all applicable items before starting an IMPL-\* phase. Items
are organized by which implementation phase they block.

### Before IMPL-01 (CLI Extraction)

- [ ] OQ-01: Decide joke data strategy — move inline, drop, or declare create-qwik dependency
- [ ] OQ-04: Survey IDE extension and CI template consumers of `qwik version` vs `qwik --version`
- [ ] OQ-05: Decide whether `migrate-v2` / `qwik upgrade` is shown in help output
- [ ] EB-01: Decide starters path strategy for standalone package (accept path param, move function, or co-ship)
- [ ] EB-02: Decide whether `starters/apps/` is co-shipped with `@qwik.dev/core` or moved to create-qwik
- [ ] EB-03: Refactor `updateApp()` to accept explicit `applyViteConfig?: boolean` parameter (removes CODE_MOD global dependency)
- [ ] EB-04: Extract or duplicate shared CLI type definitions (`IntegrationData`, `CreateAppResult`, `CreateAppOptions`, `IntegrationType`)
- [ ] EB-05: Define runtime version injection contract for base starter devDependencies
- [ ] EB-06: Normalize cross-package import path forms to a single canonical form (recommended before extraction)
- [ ] EB-07: Declare all runtime-used packages as `dependencies` in `create-qwik/package.json`

### Before IMPL-02 (Qwik Upgrade Implementation)

- [ ] OQ-02: Verify migrate-v2 monorepo behavior — run from workspace root, confirm which package.json is targeted
- [ ] OQ-03: Determine whether `updateConfigurations()` must be re-implemented for any v1 project configurations not covered by PR #7159
- [ ] OQ-06: Test ts-morph rename scope with local variable collision fixtures — confirm or deny false-positive renames
- [ ] OQ-07: Test `visitNotIgnoredFiles` with no `.gitignore` and with symlinked directories — confirm `.git/` exposure and traversal depth

---

## Verified Against

- Branch: `build/v2`
- Commit: `bfe19e8d9`
- Source spec documents:
  - `.planning/phases/05-command-inventory-compatibility-contract/COMPATIBILITY-CONTRACT.md`
  - `.planning/phases/07-migrate-v2-behavioral-spec/MIG-DEPS-AND-UPGRADE.md`
  - `.planning/phases/08-starter-adapter-assets-coupling-report/COUPLING-REPORT.md`
  - `.planning/STATE.md` (decisions section, phases 05-08)
