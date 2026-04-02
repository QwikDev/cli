---
phase: quick-3
plan: 01
subsystem: dependencies
tags: [cleanup, cross-spawn, node-child-process]
dependency_graph:
  requires: []
  provides: [native-child-process-usage]
  affects: [git-init, update-app, build-command]
tech_stack:
  removed: [cross-spawn, "@types/cross-spawn"]
  patterns: [node:child_process native imports]
key_files:
  modified:
    - src/create-qwik/git-init.ts
    - src/integrations/update-app.ts
    - src/commands/build/index.ts
    - package.json
    - pnpm-lock.yaml
decisions:
  - "Drop-in replacement: cross-spawn -> node:child_process with identical API surface (spawnSync, spawn)"
metrics:
  duration_seconds: 145
  completed: "2026-04-02T21:58:17Z"
  tasks_completed: 2
  tasks_total: 2
---

# Quick Task 3: Remove cross-spawn, Replace with Native node:child_process Summary

Eliminated cross-spawn runtime dependency by replacing all 3 import sites with native node:child_process spawnSync/spawn -- zero behavioral change since all async calls already used shell: true.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Replace cross-spawn imports with node:child_process | f0c158f | Done |
| 2 | Remove cross-spawn from package.json and verify | e537aea | Done |

## Changes Made

### Task 1: Replace cross-spawn imports

Three files updated with mechanical 1:1 replacements:

- **src/create-qwik/git-init.ts**: `import spawn from "cross-spawn"` -> `import { spawnSync } from "node:child_process"`. Three `spawn.sync()` calls became `spawnSync()`.
- **src/integrations/update-app.ts**: Same import swap. One `spawn.sync()` call became `spawnSync()`.
- **src/commands/build/index.ts**: `import crossSpawn from "cross-spawn"` -> `import { spawn, spawnSync } from "node:child_process"`. `crossSpawn.sync()` became `spawnSync()`, `crossSpawn()` became `spawn()`.

### Task 2: Remove from package.json

- Removed `"cross-spawn": "^7.0.6"` from dependencies
- Removed `"@types/cross-spawn": "*"` from devDependencies
- Lockfile updated via `pnpm install`
- TypeScript compilation: clean (zero errors)
- Test suite: 69 passed, 6 failed (all pre-existing failures documented in Phase 10)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `grep -rn "cross-spawn" src/ migrations/` -- no matches (PASS)
2. `grep -n "cross-spawn" package.json` -- no matches (PASS)
3. `pnpm exec tsc --noEmit` -- exit 0 (PASS)
4. Test suite -- 69/75 pass, 6 pre-existing failures unchanged (PASS)

## Self-Check: PASSED

All modified files exist. Both task commits (f0c158f, e537aea) verified in git log.
