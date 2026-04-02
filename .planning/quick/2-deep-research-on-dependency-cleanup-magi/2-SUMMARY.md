---
phase: quick-2
plan: 01
subsystem: dependencies
tags: [research, audit, magic-regexp, cross-spawn, yargs, dependency-cleanup]
dependency_graph:
  requires: []
  provides: [RESEARCH.md dependency audit]
  affects: [package.json, src/core.ts, src/app-command.ts, src/commands/build/index.ts, src/commands/new/templates.ts, src/commands/new/parse-input.ts, migrations/v2/replace-package.ts, src/create-qwik/git-init.ts, src/integrations/update-app.ts, src/create-qwik/run-non-interactive.ts]
tech_stack:
  added: []
  patterns: [native-RegExp-over-magic-regexp, node-child_process-over-cross-spawn, node-util-parseArgs-over-yargs]
key_files:
  created:
    - .planning/quick/2-deep-research-on-dependency-cleanup-magi/RESEARCH.md
  modified: []
decisions:
  - "magic-regexp: all 5 sites are trivial 1:1 RegExp literal replacements"
  - "cross-spawn: all 3 sites are drop-in node:child_process replacements (shell:true bypasses cross-spawn value-add)"
  - "yargs: significant complexity; recommend removing magic-regexp and cross-spawn first, then evaluate yargs separately"
  - "replacePackage should use String.replaceAll() instead of regex (simpler, no escaping needed)"
metrics:
  duration_minutes: 6
  completed: "2026-04-02T21:09:25Z"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
---

# Quick Task 2: Deep Research on Dependency Cleanup (magic-regexp, cross-spawn, yargs)

Comprehensive audit of 11 import sites across 3 dependencies, with native-Node replacement code for each usage and a prioritized execution plan.

## One-liner

Full dependency audit: 5 magic-regexp sites (trivial regex literals), 3 cross-spawn sites (trivial child_process drop-ins), 2 yargs sites (significant parseArgs migration with manual validation needed).

## What Was Done

### Task 1: Audit all dependency usage sites and document native replacements

**Commit:** `dafc71d`

Produced a 747-line RESEARCH.md covering:

1. **magic-regexp (5 sites, not 3 as initially estimated):**
   - `src/commands/new/templates.ts` -- SLUG_TOKEN, NAME_TOKEN, TEMPLATE_EXT
   - `src/app-command.ts` -- dynamic `--flag` matcher in getArg()
   - `migrations/v2/replace-package.ts` -- literal package name regex
   - `src/commands/new/parse-input.ts` -- SEPARATOR patterns for slug parsing
   - `src/commands/build/index.ts` -- `--mode=value` pattern with named capture group

2. **cross-spawn (3 sites):**
   - `src/create-qwik/git-init.ts` -- 3x spawnSync (git init/add/commit)
   - `src/integrations/update-app.ts` -- 1x spawnSync (post-install command)
   - `src/commands/build/index.ts` -- sync + async spawn with shell:true

3. **yargs (2 direct import sites + 6 process.argv bypass sites):**
   - `src/core.ts` -- Program base class parse() method
   - `src/create-qwik/run-non-interactive.ts` -- full positional/option parser with choices validation
   - Layer B: 6 files that read process.argv directly, partially bypassing yargs
   - Layer C: Feature-by-feature parseArgs feasibility assessment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical info] Discovered 2 additional magic-regexp sites**
- **Found during:** Task 1 grep audit
- **Issue:** Plan listed 3 known magic-regexp sites but grep found 5 (parse-input.ts and build/index.ts were not in the known list)
- **Fix:** Documented all 5 sites with full replacement code
- **Files:** RESEARCH.md

## Decisions Made

| Decision | Rationale |
|---|---|
| magic-regexp removal is trivial | All 5 usages produce standard RegExp objects; native literals are 1:1 equivalents |
| cross-spawn removal is trivial | All calls either use shell:true (bypasses cross-spawn value) or invoke standard binaries (git, npx) |
| yargs removal is significant but feasible | Only 2 import sites, but Program base class affects all 8 commands; manual validation code needed |
| replacePackage should use replaceAll() | Simpler than regex; no escaping needed; Node >=20.19 guarantees availability |
| Recommended order: magic-regexp -> cross-spawn -> yargs | Lowest risk first; each removal is independent; yargs is a separate decision point |

## Self-Check: PASSED

- FOUND: .planning/quick/2-deep-research-on-dependency-cleanup-magi/RESEARCH.md (747 lines)
- FOUND: dafc71d (commit exists)
