---
phase: quick-5
plan: "01"
subsystem: tooling
tags: [typescript, tsconfig, upgrade]
dependency_graph:
  requires: []
  provides: [typescript-6-compiler]
  affects: [package.json, tsconfig.json]
tech_stack:
  added: []
  patterns: [explicit-types-array-for-ts6]
key_files:
  modified:
    - package.json
    - tsconfig.json
    - pnpm-lock.yaml
decisions:
  - "esModuleInterop removed — TS6 makes this behavior always-on; option deprecated"
  - "Explicit types array added: [node, yargs, semver, which-pm-runs] — TS6 defaults types to [] so @types/* no longer auto-discovered"
metrics:
  duration: "~3 minutes"
  completed: "2026-04-02"
  tasks: 1
  files: 3
---

# Phase quick-5 Plan 01: Upgrade TypeScript to v6 and fix tsconfig Summary

TypeScript upgraded from 5.8.3 to 6.0.2 with esModuleInterop removed and explicit types array added for TS6 @types/* discovery change.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Upgrade TypeScript to v6, fix tsconfig TS6 breaking changes | 71f5541 | package.json, tsconfig.json, pnpm-lock.yaml |

## Verification Results

- `pnpm exec tsc --version` reports: `Version 6.0.2`
- `pnpm exec tsc --noEmit` exits 0 (no type errors)
- `pnpm build` exits 0 (build succeeds, CJS + ESM outputs)
- tsconfig.json has no `esModuleInterop` key
- tsconfig.json has `"types": ["node", "yargs", "semver", "which-pm-runs"]`

## Decisions Made

1. **esModuleInterop removed** — In TypeScript 6, `esModuleInterop` is always-on behavior and the option itself is deprecated. Removing it eliminates the TS6 deprecation warning and reflects the actual semantics.

2. **Explicit types array** — TypeScript 6 changed the default for `types` from auto-discovering all `@types/*` in `node_modules` to an empty array. The four @types packages already in devDependencies (`@types/node`, `@types/yargs`, `@types/semver`, `@types/which-pm-runs`) are listed explicitly to restore equivalent behavior.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- package.json contains `"typescript": "^6.0.0"` — FOUND
- tsconfig.json has `"types"` array — FOUND
- tsconfig.json has no `esModuleInterop` — CONFIRMED
- Commit 71f5541 exists — FOUND
