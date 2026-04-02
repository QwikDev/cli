---
phase: quick-9
plan: "01"
subsystem: build, new, add, create-qwik
tags: [security, bugfix, command-injection, path-traversal, windows]
dependency_graph:
  requires: []
  provides: [secure-build-mode, safe-new-routes, complete-add-merge, cross-platform-create]
  affects: [src/commands/build/index.ts, src/commands/new/templates.ts, src/integrations/update-app.ts, src/commands/add/index.ts, src/create-qwik/create-app.ts]
tech_stack:
  added: []
  patterns: [input-validation, path-traversal-guard, package-json-merge]
key_files:
  modified:
    - src/commands/build/index.ts
    - src/commands/new/templates.ts
    - src/integrations/update-app.ts
    - src/commands/add/index.ts
    - src/create-qwik/create-app.ts
decisions:
  - Validate --mode with /^[a-zA-Z0-9._-]+$/ regex (strict allowlist, no escapes needed)
  - runSequential returns boolean; execute() returns 1 immediately on any failure
  - getOutDir path traversal guard: resolve both paths, compare with trailing-slash prefix to avoid false matches
  - loadTemplates uses resolveStubsDir() pattern matching load-integrations.ts (existsSync on 3-level path vs 4-level)
  - mergeIntegrationPackageJson exported separately so add/index.ts can call it after commitIntegration
  - isAbsolute() covers both POSIX and Windows absolute paths; decodeURIComponent removed (filesystem paths are not URI-encoded)
metrics:
  duration: "4 minutes"
  completed: "2026-04-02"
  tasks: 3
  files: 5
---

# Phase quick-9 Plan 01: Fix Critical Bugs and Security Issues Summary

**One-liner:** Command injection, path traversal, missing package.json merge, broken src/dist template resolution, and Windows path bugs all fixed with minimal targeted changes.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix command injection in build --mode and pipeline short-circuit | e49722c | src/commands/build/index.ts |
| 2 | Fix path traversal in getOutDir, fix loadTemplates src/dist resolution | fddd5fd | src/commands/new/templates.ts |
| 3 | Add mergeIntegrationPackageJson, fix createApp Windows/decodeURIComponent | 7d76e9e | src/integrations/update-app.ts, src/commands/add/index.ts, src/create-qwik/create-app.ts |

## What Was Fixed

### Security Fix 1: Command Injection (build --mode)

**File:** `src/commands/build/index.ts`

`--mode` was passed directly to shell-executed scripts via `attachMode()`. A value like `foo; rm -rf /` would execute arbitrary commands.

**Fix:** Validate `mode` in `validate()` against `/^[a-zA-Z0-9._-]+$/` before use. Invalid values set `process.exitCode = 1` and strip the mode.

### Security Fix 2: Path Traversal (qwik new)

**File:** `src/commands/new/templates.ts`

`getOutDir()` accepted `nameArg` like `../../evil` that could escape `src/routes/` to any directory on disk.

**Fix:** After computing `outDir` with `join()`, resolve both the computed path and the expected base (`src/routes/`). Throw if the resolved path does not start with the base prefix.

### Bug Fix 3: Pipeline Short-Circuit

**File:** `src/commands/build/index.ts`

`runSequential()` returned `void` so failures in prebuild, build.client, ssg, and postbuild scripts were noted (via `process.exitCode`) but the pipeline continued running.

**Fix:** `runSequential()` now returns `boolean`. All sequential call sites check the result and return early with exit code 1 on failure.

### Bug Fix 4: loadTemplates src/dist Path Resolution

**File:** `src/commands/new/templates.ts`

`loadTemplates()` used a hardcoded 3-level `join(dirname(__filename), "..", "..", "..", "stubs", "templates")` that only works in source context. In compiled output (`dist/src/commands/new/`), the path resolves incorrectly.

**Fix:** Added `resolveStubsDir()` matching the pattern in `load-integrations.ts` — tries 3 levels up first (`existsSync`), falls back to 4 levels up for `dist/`.

### Bug Fix 5: qwik add Missing Package.json Merge

**Files:** `src/integrations/update-app.ts`, `src/commands/add/index.ts`

`commitIntegration()` copied integration files but never merged `scripts`, `dependencies`, or `devDependencies` from the integration's `package.json` into the target project. Integration tooling setup was silently skipped.

**Fix:** Added `mergeIntegrationPackageJson(integration, rootDir)` exported from `update-app.ts`. Called from `AddProgram.execute()` immediately after `commitIntegration()`.

### Bug Fix 6: createApp Windows Path + decodeURIComponent

**File:** `src/create-qwik/create-app.ts`

Two bugs:
1. `outDir.startsWith("/")` rejects valid Windows absolute paths like `C:\Users\...`
2. `decodeURIComponent(outDir)` is wrong — filesystem paths are not percent-encoded

**Fix:** Replace with `isAbsolute(outDir)` (from `node:path`, works on all platforms). Remove `decodeURIComponent` entirely; use `outDir` directly throughout.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `--mode "foo; rm -rf /"` rejected with clear error message, mode set to undefined
- `getOutDir(root, "route", "../../evil")` throws traversal error
- `mergeIntegrationPackageJson` merges scripts/deps/devDeps, overwrites conflicts, sorts dep keys
- `loadTemplates()` resolves correctly from both `src/commands/new/` and `dist/src/commands/new/`
- `runSequential` returns false on non-zero exit; execute() returns 1 immediately
- `createApp` with Windows-style absolute path no longer rejected; no decodeURIComponent call
- `pnpm tsc --noEmit` passes with zero errors

## Self-Check: PASSED

All 5 modified files confirmed present on disk. All 3 task commits (e49722c, fddd5fd, 7d76e9e) confirmed in git log.
