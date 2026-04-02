---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
autonomous: true
requirements: [QUICK-5]
must_haves:
  truths:
    - "TypeScript 6.x is installed and resolves"
    - "tsc --noEmit passes with no errors"
    - "Build succeeds (vp pack)"
  artifacts:
    - path: "package.json"
      provides: "typescript ^6.0.0 in devDependencies"
      contains: '"typescript": "^6'
    - path: "tsconfig.json"
      provides: "TS6-compatible compiler options"
      contains: '"types":'
  key_links:
    - from: "tsconfig.json"
      to: "node_modules/@types/*"
      via: "explicit types array"
      pattern: '"types".*node.*yargs.*semver'
---

<objective>
Upgrade TypeScript from v5 to v6 and fix tsconfig.json for TS6 breaking changes.

Purpose: Stay on latest TypeScript for language features and tooling compatibility.
Output: Working build with TypeScript 6.x, clean tsc --noEmit.
</objective>

<execution_context>
@/Users/jackshelton/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jackshelton/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@package.json
@tsconfig.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade TypeScript and fix tsconfig for TS6 compatibility</name>
  <files>package.json, tsconfig.json</files>
  <action>
    1. In package.json, change `"typescript": "^5.8.3"` to `"typescript": "^6.0.0"` in devDependencies.

    2. In tsconfig.json, make these changes:
       a. REMOVE the `"esModuleInterop": true` line — TS6 has this behavior always-on, the option is deprecated.
       b. ADD `"types": ["node", "yargs", "semver", "which-pm-runs"]` to compilerOptions — TS6 defaults `types` to `[]` so @types/* packages are no longer auto-discovered. These match the @types/* packages in devDependencies.

    3. Run `pnpm install` to install TypeScript 6.x.

    4. Run `pnpm exec tsc --noEmit` to verify no type errors.

    5. Run `pnpm build` to verify the build still succeeds.

    Note: `noUncheckedSideEffectImports` defaults to true in TS6 but the codebase has no bare side-effect imports, so no action needed there.
  </action>
  <verify>
    <automated>cd /Users/jackshelton/dev/open-source/qwik-cli && pnpm exec tsc --noEmit && pnpm build</automated>
  </verify>
  <done>TypeScript 6.x installed, tsc --noEmit clean, build succeeds, esModuleInterop removed, types array added</done>
</task>

</tasks>

<verification>
- `pnpm exec tsc --version` reports 6.x
- `pnpm exec tsc --noEmit` exits 0
- `pnpm build` exits 0
- tsconfig.json has no `esModuleInterop` key
- tsconfig.json has `"types": ["node", "yargs", "semver", "which-pm-runs"]`
</verification>

<success_criteria>
TypeScript 6.x is the active compiler, all type checks pass, build succeeds with no regressions.
</success_criteria>

<output>
After completion, create `.planning/quick/5-upgrade-typescript-to-v6-and-fix-tsconfi/5-SUMMARY.md`
</output>
