---
phase: quick-8
plan: "01"
subsystem: ci
tags: [ci, github-actions, matrix, cross-platform, cli-testing]
dependency_graph:
  requires: []
  provides: [cross-platform-cli-test-matrix]
  affects: [.github/workflows/cli.yml]
tech_stack:
  added: [siguici/setup-js@v1, voidzero-dev/setup-vp@v1, panam-cli]
  patterns: [matrix-strategy, os-runtime-pm-matrix]
key_files:
  created: [.github/workflows/cli.yml]
  modified: []
decisions:
  - "cli.yml kept separate from ci.yml — quality gates (lint/format/typecheck) belong in ci.yml; runtime compatibility belongs in cli.yml"
  - "setup-vp@v1 placed before setup-js so Node 24 is available before runtime/pm setup runs"
  - "shell: bash on lockfile removal step for Windows compat (rm is not a native Windows cmd)"
  - "scripts: build,test passed to setup-js so panam orchestrates both steps under the selected runtime"
metrics:
  duration: "< 5 minutes"
  completed: "2026-04-02"
  tasks_completed: 1
  files_created: 1
---

# Phase quick-8 Plan 01: Cross-Platform CLI Matrix Workflow Summary

**One-liner:** New `.github/workflows/cli.yml` with a 3x3x3 matrix (27 combos) covering ubuntu/macos/windows, node/deno/bun, and default/pnpm/yarn using setup-vp + panam-cli + setup-js.

## What Was Built

A dedicated GitHub Actions workflow for cross-platform CLI testing, kept separate from `ci.yml` which handles quality gates (lint, format, typecheck). The workflow tests the CLI across 27 combinations:

- **OS:** ubuntu-latest, macos-latest, windows-latest
- **Runtime:** node, deno, bun
- **Package manager:** default (npm), pnpm, yarn

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create cli.yml with cross-platform matrix strategy | 7580d26 | .github/workflows/cli.yml |

## Decisions Made

1. **Separate workflow file** — `cli.yml` handles runtime/OS/PM compatibility; `ci.yml` handles code quality gates. Mirrors QwikDev/astro's split pattern.
2. **setup-vp before setup-js** — Volta Proxy (vp) must be installed first to provide Node 24 as a baseline before setup-js configures the matrix runtime.
3. **`shell: bash` on lockfile step** — `rm` is a bash command; without explicit shell override, Windows runners use PowerShell by default.
4. **`scripts: build,test`** — passes both scripts to setup-js so panam runs them sequentially under the selected runtime/PM combo.
5. **No concurrency group** — kept simple like QwikDev/astro's cli.yml; PRs don't need cancel-in-progress for compatibility test jobs.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `.github/workflows/cli.yml` exists
- [x] YAML is valid (python3 yaml.safe_load passes)
- [x] `ci.yml` is unchanged
- [x] Matrix has os, runtime, pm, experimental dimensions
- [x] `setup-vp@v1` present
- [x] `siguici/setup-js@v1` present
- [x] `panam-cli` installed globally
- [x] `shell: bash` on lockfile step
- [x] `timeout-minutes: 60` set
- [x] Commit 7580d26 exists

## Self-Check: PASSED
