---
phase: 05-add-and-upgrade-commands
verified: 2026-04-01T00:00:00Z
status: gaps_found
score: 17/18 must-haves verified
re_verification: false
gaps:
  - truth: "add command stub executes and returns 0 in non-interactive mode with no args (router unit test)"
    status: failed
    reason: "AddProgram now auto-selects the single available integration (cloudflare-pages) in non-interactive mode, then calls scanBoolean() for consent which hangs (no stdin). The router.spec.ts test 'add command stub executes and returns 0' times out with exit code 13. This is a regression caused by Phase 5 implementation changing the behavior that the pre-existing router unit test was checking."
    artifacts:
      - path: "src/commands/add/index.ts"
        issue: "In non-interactive mode with no id and exactly 1 integration, auto-selects and then calls scanBoolean() for consent — which hangs when stdin is empty. The test expects exit 0 but gets a timeout."
      - path: "tests/unit/router.spec.ts"
        issue: "Test 'add command stub executes and returns 0' (line 97) calls AddProgram.run(['node', 'qwik', 'add']) with setInteractive(false) and no stdin — hangs at consent prompt."
    missing:
      - "Either: (a) skip the consent gate in execute() when skipConfirmation is not set AND there's no id (no-op branch), OR (b) update the router unit test to pass --skipConfirmation=true or provide a valid integration id, OR (c) when no integration id is provided and only 1 integration exists, treat the non-interactive case as requiring skipConfirmation=true to proceed (panic otherwise)"
      - "The fix must preserve ADD-01/02/03 golden test behavior while making the router unit test pass"
---

# Phase 05: Add and Upgrade Commands Verification Report

**Phase Goal:** `qwik add` installs integrations through the full consent-and-install pipeline; `qwik upgrade` performs the 5-step migration in exact order with oxc-parser AST codemods and the substring-safe replacement sequence
**Verified:** 2026-04-01T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | ignore and semver packages are installed and importable | VERIFIED | Both in package.json dependencies; `node -e "require('ignore'); require('semver')"` succeeds |
| 2  | stubs/adapters/cloudflare-pages/ contains package.json with `__qwik__` metadata and vite.config.ts | VERIFIED | File exists at correct path; `__qwik__` block with displayName, priority, nextSteps confirmed |
| 3  | visitNotIgnoredFiles traverses files respecting .gitignore and always excludes .git/ | VERIFIED | src/migrate/visit-not-ignored.ts: always calls `ig.add(".git")` before any .gitignore read |
| 4  | isBinaryPath correctly identifies binary file extensions | VERIFIED | `.png` returns true, `.ts` returns false, `.tsx` returns false, `.wasm` returns true (live test passed) |
| 5  | loadIntegrations() discovers cloudflare-pages from stubs/adapters/ via adaptive import.meta.url resolution | VERIFIED | Live test: `loadIntegrations()` returns 1 integration, id=`cloudflare-pages`, 1 filePath = `adapters/cloudflare-pages/vite.config.ts` |
| 6  | qwik add cloudflare-pages --skipConfirmation=true writes adapter files to project and exits 0 | VERIFIED | ADD-01 golden test passes: `adapters/cloudflare-pages/vite.config.ts` created in tmpDir |
| 7  | qwik add --projectDir=./sub --skipConfirmation=true writes adapter files to sub/ subdirectory | VERIFIED | ADD-02 golden test passes: file created under `sub/adapters/cloudflare-pages/vite.config.ts` |
| 8  | qwik add nonexistent-integration exits 1 | VERIFIED | ADD-03 golden test passes: exit code 1 |
| 9  | add command in non-interactive mode with no args returns 0 (router unit test) | FAILED | Router unit test "add command stub executes and returns 0" times out: auto-select picks cloudflare-pages then hangs at consent prompt with no stdin |
| 10 | replaceImportInFiles renames import specifiers in .ts/.tsx files using oxc-parser AST + magic-string | VERIFIED | IMPORT_RENAME_ROUNDS has 3 rounds with 8 total changes; module imports parseSync from oxc-parser and MagicString from magic-string |
| 11 | replacePackage performs global text replacement in non-binary files via visitNotIgnoredFiles | VERIFIED | src/migrate/replace-package.ts imports both visitNotIgnoredFiles and isBinaryPath; applies regex replacement |
| 12 | runAllPackageReplacements calls replacePackage 5 times with @builder.io/qwik LAST | VERIFIED | Source confirms exact 5-call order; @builder.io/qwik is call #5 with comment "MUST BE LAST" |
| 13 | getLatestV2Version resolves dist-tag version from npm for @qwik.dev packages | VERIFIED | src/migrate/versions.ts: execSync npm dist-tag, parses tag:version lines, applies VERSION_TAG_PRIORITY, filters semver.major === 2 |
| 14 | checkTsMorphPreExisting returns false when ts-morph not pre-existing | VERIFIED | src/migrate/update-dependencies.ts: reads package.json, checks deps and devDeps for ts-morph key |
| 15 | qwik migrate-v2 runs 5-step migration in exact order and exits 0 on success | VERIFIED | MIG-01 golden test passes: imports renamed, packages replaced, ts-morph removed |
| 16 | qwik upgrade routes to the same MigrateProgram as migrate-v2 | VERIFIED | router.ts: both `migrate-v2` and `upgrade` keys map to `import('./commands/migrate/index.js')` |
| 17 | User cancel at confirmation prompt exits 0 (not 1) | VERIFIED | MIG-02 golden test passes: `\x03` (Ctrl+C) via stdin triggers bye() → exit 0; files unchanged |
| 18 | .gitignore-excluded files (dist/) are not rewritten | VERIFIED | MIG-05 golden test passes: dist/bundle.js still contains @builder.io/qwik after migration |

**Score:** 17/18 truths verified

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `stubs/adapters/cloudflare-pages/package.json` | VERIFIED | Exists; contains `__qwik__` with displayName "Adapter: Cloudflare Pages", priority 40 |
| `stubs/adapters/cloudflare-pages/adapters/cloudflare-pages/vite.config.ts` | VERIFIED | Exists; contains cloudflarePagesAdapter import |
| `src/migrate/visit-not-ignored.ts` | VERIFIED | Exports `visitNotIgnoredFiles`; substantive implementation (80 lines) |
| `src/migrate/binary-extensions.ts` | VERIFIED | Exports `isBinaryPath` and `BINARY_EXTENSIONS`; ~200 extensions in Set; `.ts` correctly NOT included |
| `src/integrations/load-integrations.ts` | VERIFIED | Exports `loadIntegrations`, `sortIntegrationsAndReturnAsClackOptions`; adaptive STUBS_DIR resolution |
| `src/integrations/update-app.ts` | VERIFIED | Exports `commitIntegration`, `integrationHasDeps`, `installDeps`, `runPostInstall` |
| `src/commands/add/index.ts` | PARTIAL | Exports `AddProgram`; full pipeline implemented; but causes regression in router unit test |
| `src/migrate/rename-import.ts` | VERIFIED | Exports `replaceImportInFiles`, `IMPORT_RENAME_ROUNDS`; uses oxc-parser + magic-string |
| `src/migrate/replace-package.ts` | VERIFIED | Exports `replacePackage`, `runAllPackageReplacements`; 5-call order enforced |
| `src/migrate/versions.ts` | VERIFIED | Exports `getLatestV2Version`, `resolveV2Versions`, `PACKAGE_NAMES`, `VERSION_TAG_PRIORITY` |
| `src/migrate/update-dependencies.ts` | VERIFIED | Exports `checkTsMorphPreExisting`, `removeTsMorphFromPackageJson`, `updateDependencies` |
| `src/migrate/run-migration.ts` | VERIFIED | Exports `runV2Migration`; 5-step sequence with chdir/restore wrapper |
| `src/commands/migrate/index.ts` | VERIFIED | Exports `MigrateProgram`; scanBoolean in execute() for stdin-driven testing |
| `src/router.ts` | VERIFIED | Contains both `migrate-v2` and `upgrade` keys pointing to same import; 9 total commands |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/migrate/visit-not-ignored.ts` | `ignore` | `import ignore from 'ignore'` | WIRED | Line 1: `import ignore from "ignore"` |
| `src/commands/add/index.ts` | `src/integrations/load-integrations.ts` | `import { loadIntegrations }` | WIRED | Lines 5-7 |
| `src/integrations/load-integrations.ts` | `stubs/adapters/` | `resolveStubsDir()` with `import.meta.url` | WIRED | resolveStubsDir() checks 2-level path first (tsx), falls back to 3-level (dist) |
| `src/commands/add/index.ts` | `src/integrations/update-app.ts` | `import { commitIntegration }` | WIRED | Lines 8-13 |
| `src/migrate/rename-import.ts` | `oxc-parser` | `import { parseSync } from 'oxc-parser'` | WIRED | Line 2 |
| `src/migrate/rename-import.ts` | `magic-string` | `import MagicString from 'magic-string'` | WIRED | Line 1 |
| `src/migrate/replace-package.ts` | `src/migrate/visit-not-ignored.ts` | `import { visitNotIgnoredFiles }` | WIRED | Line 4 |
| `src/migrate/replace-package.ts` | `src/migrate/binary-extensions.ts` | `import { isBinaryPath }` | WIRED | Line 3 |
| `src/commands/migrate/index.ts` | `src/migrate/run-migration.ts` | `import { runV2Migration }` | WIRED | Line 3 |
| `src/migrate/run-migration.ts` | `src/migrate/rename-import.ts` | `import { replaceImportInFiles, IMPORT_RENAME_ROUNDS }` | WIRED | Line 2 |
| `src/migrate/run-migration.ts` | `src/migrate/replace-package.ts` | `import { runAllPackageReplacements }` | WIRED | Line 3 |
| `src/router.ts` | `src/commands/migrate/index.ts` | `upgrade` key in COMMANDS map | WIRED | Line 15: `upgrade: () => import('./commands/migrate/index.js')` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ADD-01 | 05-02 | `qwik add [integration-id]` positional selects integration | SATISFIED | ADD-01 golden test passes; `add cloudflare-pages --skipConfirmation=true` exits 0 and writes files |
| ADD-02 | 05-02 | `--skipConfirmation=true` bypasses consent gate | SATISFIED | ADD-02 golden test passes; `--projectDir=./sub` writes to subdirectory |
| ADD-03 | 05-02 | `--projectDir=<path>` flag writes files to subdirectory | SATISFIED | ADD-02 golden test passes |
| ADD-04 | 05-02 | Interactive integration selection via @clack/prompts select | SATISFIED | interact() calls scanChoice when isIt() and no id provided |
| ADD-05 | 05-02 | Integration file writes committed only after confirmation | SATISFIED | execute() calls scanBoolean before commitIntegration when !skipConfirmation |
| ADD-06 | 05-02 | installDeps() runs when integration adds dependencies | SATISFIED | integrationHasDeps check + installDeps call in execute() |
| ADD-07 | 05-02 | postInstall script execution when `__qwik__.postInstall` exists | SATISFIED | runPostInstall called when qwikMeta.postInstall is truthy |
| ADD-08 | 05-01, 05-04 | loadIntegrations() discovers from stubs/ | SATISFIED | loadIntegrations() live-tested; discovers cloudflare-pages correctly |
| ADD-09 | 05-02 | Exit 0 on success, exit 1 on failure | SATISFIED | panic() called on unknown integration (exits 1); returns 0 on success |
| UPGR-01 | 05-04 | `qwik migrate-v2` alias routes to upgrade command | SATISFIED | Both commands in router.ts COMMANDS map pointing to same import |
| UPGR-02 | 05-04 | 5-step migration sequence in exact documented order | SATISFIED | runV2Migration: Step 1 ts-morph check → Step 2 AST rename → Step 3 pkg replace → Step 4 ts-morph cleanup → Step 5 deps update |
| UPGR-03 | 05-03 | AST import renaming: 3 rounds, 8 mappings via oxc-parser + magic-string | SATISFIED | IMPORT_RENAME_ROUNDS verified: 3 rounds, 8 total mappings (3+1+4) |
| UPGR-04 | 05-03 | Text-replacement replacePackage() x5 calls — @builder.io/qwik MUST run last | SATISFIED | runAllPackageReplacements: 5 calls in exact order, @builder.io/qwik is call #5 |
| UPGR-05 | 05-03 | npm dist-tag version resolution for @qwik.dev/* packages | SATISFIED | getLatestV2Version queries npm dist-tag, applies VERSION_TAG_PRIORITY, filters semver.major === 2 |
| UPGR-06 | 05-01 | Gitignore-respected file traversal via visitNotIgnoredFiles | SATISFIED | MIG-05 golden test passes; dist/ (gitignored) not rewritten |
| UPGR-07 | 05-01 | Binary file detection skip during text replacement | SATISFIED | replacePackage checks isBinaryPath(relPath) before reading/writing |
| UPGR-08 | 05-03 | ts-morph NOT in final package.json after migration (idempotency: preserve if pre-existing) | SATISFIED | MIG-03 golden test passes; checkTsMorphPreExisting gates removeTsMorphFromPackageJson |
| UPGR-09 | 05-04 | Exit 0 on user cancel | SATISFIED | MIG-02 golden test passes: \x03 cancel → bye() → exit 0 |
| UPGR-10 | 05-04 | User confirmation prompt before destructive migration begins | SATISFIED | scanBoolean("Do you want to proceed with the migration?") in execute() |

All 20 requirement IDs from PLAN frontmatter are accounted for. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/unit/router.spec.ts` | 97 | Test group named "command stubs return 0" tests AddProgram with no args/no skipConfirmation | Blocker | Test times out (exit 13) because AddProgram now auto-selects cloudflare-pages and calls scanBoolean() with no stdin — regression introduced when AddProgram stub was replaced with real implementation |

### Human Verification Required

#### 1. Interactive Integration Selection (ADD-04)

**Test:** Run `node --import tsx/esm bin/qwik.ts add` in a terminal with TTY
**Expected:** @clack/prompts select appears listing "Adapter: Cloudflare Pages"; selecting it proceeds to consent gate
**Why human:** isIt() requires TTY; non-interactive tests cannot exercise scanChoice path

#### 2. Interactive Consent Gate (ADD-05)

**Test:** Run `node --import tsx/esm bin/qwik.ts add cloudflare-pages` (no --skipConfirmation)
**Expected:** "Ready to apply cloudflare-pages?" prompt appears; confirming writes files; declining exits 0 without writing
**Why human:** Requires TTY for @clack/prompts scanBoolean

#### 3. Upgrade Command Display

**Test:** Run `node --import tsx/esm bin/qwik.ts help`
**Expected:** `upgrade` should not appear in help output (UPGR-01 note: showInHelp deferred to UX-02 v2)
**Why human:** Visual inspection of help output needed

### Gaps Summary

**1 gap found** blocking full verification:

The router unit test `"add command stub executes and returns 0"` (in `tests/unit/router.spec.ts`, line 97) was written against the original AddProgram stub. The test calls `program.run(['node', 'qwik', 'add'])` in non-interactive mode (`setInteractive(false)`) with no stdin. The real implementation auto-selects the single available integration (cloudflare-pages) in this scenario, then calls `scanBoolean()` for consent — which hangs waiting for stdin input, causing a test timeout (exit code 13).

This is a regression introduced by Phase 5. The golden integration tests (ADD-01/02/03) all pass correctly. The 5 MIG golden tests all pass. The only failure is this single unit test that exercised the stub's no-op behavior and must be updated to reflect the real implementation's behavior.

**Root cause:** The test name "add command stub executes and returns 0" reflects the pre-Phase-5 stub state. The test itself was not updated when AddProgram was rewritten. Phase 5 Plan 04 updated `router.spec.ts` for the router COMMANDS count change but did not update the behavior-testing portion for the add command stub.

**Fix scope:** Small — the test should either:
- Be updated to pass `--skipConfirmation=true` and a valid integration id so the command completes without prompting, OR
- Be updated to expect that with no id provided and no skipConfirmation, the command panics (exits 1), OR
- AddProgram execute() should panic (not hang) when no id is provided and skipConfirmation is false in non-interactive mode

---

_Verified: 2026-04-01T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
