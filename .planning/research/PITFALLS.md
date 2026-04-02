# Pitfalls Research

**Domain:** CLI extraction / reimplementation (monorepo → standalone package)
**Researched:** 2026-04-02 (v1.1 update appended to 2026-04-01 original)
**Confidence:** HIGH — v1.0 pitfalls sourced from verified spec documents; v1.1 pitfalls sourced from live tsc --noEmit output, oxc-parser runtime inspection, npm documentation, and oxfmt beta release notes

---

## Critical Pitfalls

### Pitfall 1: Asset Path Resolution Breaks on Extraction — The __dirname / import.meta.url Trap

**What goes wrong:**
`loadIntegrations()` resolves its `starters/` directory via `join(__dirname, 'starters')` relative to the compiled bundle file. This works today because esbuild inlines the code into each bundle at build time, making `import.meta.url` point to the bundle's own location. The moment the function is imported from a separately installed npm package (not inlined), `import.meta.url` points to `node_modules/@qwik.dev/core/dist/cli.mjs` — a location that has no `starters/` sibling. `loadIntegrations()` either throws or returns an empty array, and all template/integration selection silently breaks.

**Why it happens:**
The monorepo build pipeline masks this failure mode. esbuild's `bundle: true` physically copies the function into every consumer, so the resolution "just works" regardless of where you call it from. The distinction between "bundled inline" and "imported as a package" is invisible during development.

**How to avoid:**
Do not use `__dirname`-relative asset resolution in any function that will be imported across package boundaries. Instead, place all templates inside a `stubs/` directory co-located with the new standalone package and resolve paths relative to the module that owns the assets — not a shared utility function in a separate package. The `create-qwikdev-astro` reference implementation uses this pattern explicitly.

**Warning signs:**
- Any function that calls `join(__dirname, ...)` or `join(fileURLToPath(import.meta.url), ...)`  where the directory being joined contains assets (templates, fixtures, data files) that are not guaranteed to travel with the function's compiled output.
- esbuild / tsdown build scripts that copy asset directories: if those copy operations are in a *different* package's build script than the one that will consume the assets at runtime, this is the trap.

**Phase to address:**
Phase 1 (repository scaffold and tooling setup). The `stubs/` directory layout and asset resolution strategy must be established before any command implementation begins — retrofitting after commands are written requires touching every path reference.

---

### Pitfall 2: Build-Time Global Gates Produce Corrupt Output on Import — The CODE_MOD Trap

**What goes wrong:**
`updateApp()` reads `(globalThis as any).CODE_MOD` to decide whether to call `updateViteConfigs()`. In the monorepo, esbuild's `define` replaces this with `false` in the create-qwik bundle and `true` in the qwik CLI bundle. If the new standalone package imports `updateApp()` from a separately installed `@qwik.dev/core` that was compiled with `CODE_MOD = true`, `updateViteConfigs()` runs during new project scaffolding — corrupting freshly created vite config files with integration-specific transformations that belong only in the `qwik add` flow.

**Why it happens:**
Build-time constants injected via bundler `define` are a common monorepo technique to produce two differently-behaved builds from the same source. The mechanism only works when code is bundled; it breaks silently when code is used as a live import because the compiled-in constant reflects the *source package's* build context, not the consumer's intent.

**How to avoid:**
Replace the `CODE_MOD` global with an explicit parameter: `updateApp(opts: { applyViteConfig?: boolean; ... })`. Callers in the `qwik add` flow pass `applyViteConfig: true`; callers in the scaffolding flow pass `applyViteConfig: false` (or omit it, defaulting to `false`). This is documented in EB-03 of `OPEN-QUESTIONS.md` and must be resolved before IMPL-01.

**Warning signs:**
- Any `globalThis.*` access in shared utility code.
- Any `(globalThis as any).SOME_CONSTANT` pattern that differs between two bundles.
- Build scripts with esbuild/tsdown `define` entries that set different values per output target.

**Phase to address:**
Phase 1 (repository scaffold) or as a prerequisite audit before Phase 2 (first command implementation). The refactor is small but must happen before `updateApp()` is reimplemented.

---

### Pitfall 3: AST Rename Scope Is File-Wide, Not Import-Scoped — Global Identifier Collision

**What goes wrong:**
The ts-morph (and any replacement oxc-based) codemod renames identifiers in two passes: first it renames named imports on the matching import declaration, then it scans `getDescendantsOfKind(Identifier)` across the **entire source file** and renames any identifier whose text matches an old import name. A local variable, function parameter, type alias, or JSX attribute named `qwikCity`, `component`, `jsx`, or any other member of the rename map will be renamed even if it has no semantic relationship to the `@builder.io/qwik-city` import. The output is syntactically valid TypeScript but semantically wrong — and the migration reports success.

**Why it happens:**
The current ts-morph implementation (in `rename-import.ts`) was written to solve the common case where the named import and its usages share the same identifier text. The global scan avoids building a symbol reference graph. It works for most real projects but is incorrect by design for any project with local variable shadowing.

**How to avoid:**
When reimplementing with oxc-parser + magic-string, scope the identifier rename to references that are semantically bound to the target import declaration. Use the import's binding as the anchor: collect the local binding name introduced by the import, then use scope analysis to find only that binding's references rather than all identifiers matching the text. If full scope analysis is too complex for the MVP, at minimum add a test fixture with local variable collision (e.g., `const jsx = someOtherLib.jsx`) and verify the output is correct.

**Warning signs:**
- Test suite for `qwik upgrade` / `migrate-v2` reimplementation does not include fixtures with local variables that share names with the renamed exports.
- OQ-06 in `OPEN-QUESTIONS.md` is marked unverified at the start of IMPL-02.
- The rename step reports "Updated X files" with no per-identifier validation.

**Phase to address:**
Phase covering `qwik upgrade` reimplementation (IMPL-02). Must include collision fixture tests before the codemod is considered shipped.

---

### Pitfall 4: Package Rename Order Constraint — Substring Prefix Corruption

**What goes wrong:**
`@builder.io/qwik` is a prefix string of `@builder.io/qwik-city`, `@builder.io/qwik-react`, and `@builder.io/qwik/jsx-runtime`. The text replacement step (`replaceMentions`) uses `new RegExp(oldPackageName, 'g')` without anchoring. If `@builder.io/qwik` is replaced before the more specific package names, those names become `@qwik.dev/core-city`, `@qwik.dev/core-react`, and `@qwik.dev/core/jsx-runtime` — broken names that are not valid npm packages. The migration produces a project that cannot be installed.

**Why it happens:**
Text replacement is applied globally to all files. Without substring ordering constraints, any replacement whose target string is a prefix of another target string corrupts the longer names. This is a classic "replace in dependency order" problem.

**How to avoid:**
The call sequence is MUST PRESERVE behavior documented in `MIG-MUTATION-RULES.md`: `@builder.io/qwik` must always be the last replacement (Call 5 of 5). Encode this constraint as a test: run the five replacements in the wrong order against a fixture file and verify the output is corrupt, then run in the correct order and verify it is correct. The test documents the constraint and guards against accidental reordering.

**Warning signs:**
- The 5-call sequence is refactored to be data-driven (an array of `[from, to]` pairs) without preserving ordering constraints.
- Any sort, deduplication, or parallelization of the replacement calls.
- Missing test covering the substring ordering invariant.

**Phase to address:**
IMPL-02 (`qwik upgrade`). Add an ordering constraint test as part of the codemod unit tests.

---

### Pitfall 5: Transient Dependency Lifecycle — ts-morph / oxc Install/Remove Race

**What goes wrong:**
The current migration installs ts-morph as a devDependency at Step 1 and removes it from `package.json` at Step 4 (after AST rename completes). If the migration is interrupted between Step 1 and Step 4 — or if the replacement implementation omits the cleanup step — ts-morph remains in the user's `package.json` as a permanent devDependency. This pollutes the user's dependency tree, may conflict with other tooling, and adds bloat to CI install times indefinitely.

The oxc-parser replacement eliminates ts-morph entirely, which removes the install/remove lifecycle. But if the migration still needs any transient tooling (npm dist-tag query, temporary utilities), the same pattern applies.

**Why it happens:**
CLI migrations frequently install tooling they need for a one-time operation. The removal step is easy to forget or to implement incorrectly (e.g., only deleting from `devDependencies` but missing `dependencies`, or not handling the idempotency guard on re-runs).

**How to avoid:**
With oxc-parser as the AST backend (a permanent CLI dependency, not a transient install), the ts-morph lifecycle is eliminated. Confirm this is the case before IMPL-02: oxc-parser must be listed in the standalone package's `dependencies`, not installed dynamically. Document explicitly that there is no transient install step.

**Warning signs:**
- Any `runInstall()` call inside the migration that conditionally adds a package to `package.json`.
- The migration's `package.json` mutation steps include a package that is not in the permanent CLI `dependencies`.
- No idempotency test verifying that re-running migration on an already-migrated project does not add permanent devDependencies.

**Phase to address:**
IMPL-02 setup. Confirm oxc-parser is a permanent dependency before writing any AST step.

---

### Pitfall 6: .gitignore Absence Causes .git/ Directory Corruption

**What goes wrong:**
`visitNotIgnoredFiles` relies on an `ignore` instance built from `.gitignore` contents. If no `.gitignore` exists, `ig` is `undefined`. The guard `ig?.ignores(relPath)` evaluates to `false` for every path, meaning every file is visited — including `.git/` internals. The text replacement step (`replaceMentions`) then writes to files like `.git/COMMIT_EDITMSG`, `.git/config`, or `.git/HEAD`. Writing any of these files corrupts the git repository.

**Why it happens:**
The `?.` optional chaining produces a silent no-op when `ig` is `undefined` rather than "skip nothing by default" or "treat all files as not-gitignored except `.git/`". The intent was likely "if we have gitignore rules, apply them" but the implementation means "if we have no gitignore rules, visit everything."

**How to avoid:**
In the reimplementation of `visitNotIgnoredFiles`, add a hard-coded guard: always exclude `.git/` and `node_modules/` regardless of `.gitignore` presence. Do not rely solely on `.gitignore` patterns for safety-critical exclusions. This is tracked as OQ-07 in `OPEN-QUESTIONS.md`.

**Warning signs:**
- OQ-07 is unverified at the start of IMPL-02.
- The `visitNotIgnoredFiles` reimplementation uses optional chaining on the ignore instance without a fallback exclusion list.
- No test fixture for "project with no .gitignore" in the upgrade command test suite.

**Phase to address:**
IMPL-02, during the `visitNotIgnoredFiles` reimplementation. Must include a test: run upgrade against a fixture project with no `.gitignore` and assert that no `.git/**` files are written.

---

### Pitfall 7: Version Sync Drift — Stale Starter devDependencies on Independent Release

**What goes wrong:**
In the monorepo, `syncBaseStarterVersionsFromQwik()` bakes the current Qwik version into `starters/apps/base/package.json` at build time. As a standalone package on its own release cadence, this baked version becomes stale between releases. Users scaffolding new projects with an older version of `@qwik.dev/cli` receive starter templates pinning outdated `@qwik.dev/core` and `@qwik.dev/router` versions. The user is immediately required to upgrade their fresh project.

**Why it happens:**
Build-time version injection is appropriate in a monorepo where all packages share a single build. In a standalone package, the "current version at build time" diverges from "the version the user actually has installed" as soon as any package releases independently.

**How to avoid:**
Implement runtime version injection: during scaffolding, read the installed version of `@qwik.dev/core` (e.g., via `require('@qwik.dev/core/package.json').version` or a peer dependency resolution) and write that version into the generated `package.json` rather than using a compile-time constant. This is EB-05 in `OPEN-QUESTIONS.md`.

**Warning signs:**
- `stubs/apps/base/package.json` contains a hardcoded `@qwik.dev/core` version string.
- The scaffolding flow does not read the installed peer dependency version at runtime.
- Integration tests for `create-qwik` only assert that `package.json` is generated, not that it contains the expected version.

**Phase to address:**
Phase covering the `create-qwik` scaffolding flow. The version injection contract must be defined before the base starter template is finalized.

---

### Pitfall 8: Undeclared Runtime Dependencies — devDependency Bundling Assumption

**What goes wrong:**
`@clack/prompts`, `kleur`, and `which-pm-runs` are used at runtime in create-qwik but declared only as `devDependencies` (or not declared at all) in `create-qwik/package.json`. This works today because esbuild inlines them. In the new standalone package using tsdown for dual ESM+CJS output, any package not declared in `dependencies` may fail to resolve in consumers' environments that install only `dependencies`.

**Why it happens:**
The monorepo's esbuild pipeline bundles everything by default. Developers stop thinking about what is a "real" runtime dependency versus a "bundled" devDependency because the bundler makes the distinction irrelevant inside the monorepo. When moving to a separate package with a different build strategy, the declared dependency surface must match what is actually needed at runtime.

**How to avoid:**
Before writing the first line of implementation, audit the full dependency list and declare all runtime-used packages in `dependencies`. Do not rely on tsdown bundling to mask undeclared dependencies — even if bundling works, the `package.json` serves as a contract for consumers and security scanners. This is EB-07 in `OPEN-QUESTIONS.md`.

**Warning signs:**
- `dependencies` field in `package.json` is shorter than the number of packages imported in source files.
- Any package used in runtime code paths that appears only in `devDependencies`.
- `package.json` `exports` or `main` points to a bundled output — does not guarantee correctness if the bundle is later replaced with unbundled outputs.

**Phase to address:**
Phase 1 (repository scaffold). The `package.json` dependency manifest must be complete before any implementation phase begins.

---

## Critical Pitfalls (v1.1 Milestone-Specific)

These pitfalls are specific to the v1.1 milestone work: migration restructuring, oxfmt/oxlint switch, starters/ npm packaging, and bulk TypeScript error fixes.

---

### Pitfall 9: oxc-parser ModuleExportName Union — StringLiteral Has No `.name` Property

**What goes wrong:**
`src/migrate/rename-import.ts` line 96 accesses `specifier.imported.name` where `specifier.imported` is typed as `ModuleExportName` — a union of `Identifier | StringLiteral`. The `Identifier` variant has a `name` property. The `StringLiteral` variant does **not** — it has a `value` property instead. This generates `TS2339: Property 'name' does not exist on type 'StringLiteral'` and, at runtime, silently produces `undefined` for any module export using string-literal syntax (e.g., `import { "old-name" as foo } from "x"`), causing those imports to be missed by the rename pass.

This was confirmed by live inspection of oxc-parser v0.123 at runtime:
- `import { foo }` → `imported.type === "Identifier"`, has `.name`
- `import { "foo" as bar }` → `imported.type === "Literal"`, has `.value` not `.name`

**Why it happens:**
The code was written treating `specifier.imported` as always an `Identifier`. The TypeScript compiler with `skipLibCheck: true` in tsconfig will not catch this when reading the oxc-parser-generated types unless the union is explicitly narrowed. In the current tsconfig `skipLibCheck: false` is the effective state for source files, so tsc catches it — but the runtime behavior is already wrong for string-literal import names even if the types were correct.

**How to avoid:**
Narrow the union before accessing the name. The correct pattern is:

```typescript
const importedName: string =
  specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : specifier.imported.value;
```

Apply the same narrowing to `specifier.local` when reading `localName`. This is a one-line fix per access but must be applied consistently to both the `imported` and `local` reads in `replaceImportInFiles`.

**Warning signs:**
- `tsc --noEmit` reports `TS2339: Property 'name' does not exist on type 'StringLiteral'` on any file accessing `.imported.name` or `.exported.name` on oxc-parser AST nodes.
- The rename codemod test suite has no fixture using string-literal import syntax (e.g., `import { "useMount$" as useTask$ } from "@builder.io/qwik"`).

**Phase to address:**
v1.1 Phase 1 (Zero type errors). Fix immediately before any migration architecture restructuring — this is a correctness bug in the existing codemod, not just a type annotation issue.

---

### Pitfall 10: exactOptionalPropertyTypes — Spreading Undefined Into Optional Fields

**What goes wrong:**
With `exactOptionalPropertyTypes: true` in tsconfig, TypeScript distinguishes `{ foo?: string }` (foo may be absent) from `{ foo?: string | undefined }` (foo may be present with value undefined). Any object literal that conditionally produces an optional field by spreading a value that may be `undefined` — without first checking — generates a type error.

The codebase has **four confirmed instances** caught by `tsc --noEmit`:

1. `src/commands/add/index.ts:38` — Object literal `{ id: string | undefined; ... }` not assignable to `AddInput` because `AddInput.id` is `string?` not `string | undefined`. The `id` field is obtained from `definition._[1] as string | undefined`, which can be `undefined`, but the type `AddInput` does not have `id?: string | undefined`.

2. `src/console.ts:64` — `{ message, initialValue: boolean | undefined }` passed to `@clack/prompts confirm()` whose `ConfirmOptions.initialValue` is `boolean?` not `boolean | undefined`. When `initial` parameter is `undefined`, passing `initialValue: undefined` is invalid under `exactOptionalPropertyTypes`.

3. `src/console.ts:76` — Same pattern: `{ placeholder: string | undefined }` passed to `text()` whose `TextOptions.placeholder` is `string?` not `string | undefined`.

4. `src/console.ts:88` — Option objects with `hint?: string` in the local type not matching `@clack/prompts` `Option<T>` which uses `exactOptionalPropertyTypes`-compatible definitions.

**Why it happens:**
The canonical fix people reach for — adding `| undefined` to the interface property type — is wrong when the interface is from a third-party library (like `@clack/prompts`). The library already defines `initialValue?: boolean` meaning "may be absent". Callers must not pass `initialValue: undefined` — they must **omit the key entirely**. The correct fix is conditional spreading: `...(initial !== undefined ? { initialValue: initial } : {})`.

Bulk "fix" attempts using `ts-ignore` or broadening local types propagate the error into the type system instead of eliminating it.

**How to avoid:**
For each `exactOptionalPropertyTypes` error, determine whether the field belongs to a local type or a library type:

- **Local type** (`AddInput.id`): Add `| undefined` to the property type definition: `id?: string | undefined`.
- **Library type** (`ConfirmOptions.initialValue`, `TextOptions.placeholder`): Use conditional spread. Do not modify the library type. Pattern: `const opts: ConfirmOptions = { message, ...(initial !== undefined ? { initialValue: initial } : {}) }`.

Never use `as any` or `// @ts-ignore` to suppress these errors — they signal a real semantic difference between "absent" and "undefined".

**Warning signs:**
- `tsc --noEmit` shows `TS2375` or `TS2379` mentioning `exactOptionalPropertyTypes`.
- Code passes optional parameters directly into object literals without a defined-check: `{ someField: maybeUndefined }` where `someField` is `?`-typed in the target interface.
- Unit tests pass because Jest/Japa don't enforce types at runtime — the error is only visible via `tsc`.

**Phase to address:**
v1.1 Phase 1 (Zero type errors). Fix before restructuring migration folders — a clean compile baseline is required to verify that restructuring doesn't introduce new errors.

---

### Pitfall 11: cross-spawn `spawnSync` Signature — Undefined String in Overload Resolution

**What goes wrong:**
`src/integrations/update-app.ts` line 66 calls `spawn.sync(executor, [command, ...args], { cwd, stdio: 'inherit' })` where `executor` is `string | undefined` (returned by `getPackageManagerName()` which can return `undefined`). The `cross-spawn` type definitions for `spawnSync` have 8 overloads — none accepts `string | undefined` as the first argument. TypeScript with `strict: true` rejects this with `TS2769: No overload matches this call`.

This is a real nullability bug: if `getPackageManagerName()` returns `undefined` (no package manager detected), `executor` is `undefined`, and passing `undefined` to `spawn.sync` produces `ENOENT` at runtime. The type error is surfacing a real failure path, not a spurious annotation issue.

**Why it happens:**
The code assumes a package manager is always detected. `getPackageManagerName()` returns `string | undefined` because `which-pm-runs` can return `undefined` when no PM is in scope (e.g., a plain `node script.js` invocation). The integration install code does not guard against this.

**How to avoid:**
Add an explicit guard before the `spawn.sync` call:

```typescript
const pm = getPackageManagerName();
if (!pm) {
  throw new Error("No package manager detected; cannot run post-install script.");
}
const executor = pm === "npm" ? "npx" : pm;
spawn.sync(executor, [command, ...args], { cwd, stdio: "inherit" });
```

Do not cast `executor` to `string` with `as string` — that silences the compiler but leaves the runtime crash in place.

**Warning signs:**
- `tsc --noEmit` reports `TS2769` on any `spawn.sync` or `spawnSync` call.
- `getPackageManagerName()` return value is used without a null-check.
- Post-install script runs are not tested in a fixture that simulates no-PM-detected environment.

**Phase to address:**
v1.1 Phase 1 (Zero type errors). The guard makes the failure path explicit and testable.

---

### Pitfall 12: noUncheckedIndexedAccess — Array/Map Indexing Returns T | undefined

**What goes wrong:**
`src/app-command.ts` lines 22/22 access `this.args[idx]` and `this.args[idx + 1]` where `args` is typed `string[]`. With `noUncheckedIndexedAccess: true`, any array index access returns `T | undefined` — TypeScript error `TS18048: 'arg' is possibly 'undefined'`. The same issue applies to `COMMANDS.help` in `src/router.ts` (line 31): `COMMANDS[task]` returns `(() => Promise<...>) | undefined`, and invoking it without a guard produces `TS2722: Cannot invoke an object which is possibly 'undefined'`.

These are real nullability bugs: `args[idx + 1]` can be out-of-bounds when a flag is the last argument with no value, and `COMMANDS.help` is only safely callable after the guard `if (!task || !COMMANDS[task])` that already verified it. The compiler cannot infer this.

**Why it happens:**
`noUncheckedIndexedAccess` is part of the TypeScript "extra strict" options beyond `strict: true`. It changes the type of every array element access from `T` to `T | undefined`. Code written before this option was enabled, or code ported from a project without it, will have unanswered index accesses that look safe but aren't.

**How to avoid:**
Two patterns work:
1. **Store and narrow**: `const arg = this.args[idx]; if (arg !== undefined) { ... }`. Preferred for logic where the undefined case needs a different code path.
2. **Non-null assert after proven guard**: `COMMANDS.help!()` is acceptable only at the call site directly following the guard `if (!task || !COMMANDS[task])` — the `!COMMANDS[task]` branch exits, so the else branch is proven non-null. Use sparingly.

Never suppress with `as string` casting — it hides the undefined case from downstream consumers.

**Warning signs:**
- `tsc --noEmit` reports `TS18048: 'X' is possibly 'undefined'` on any array index access.
- `tsc --noEmit` reports `TS2722: Cannot invoke an object which is possibly 'undefined'`.
- Code pattern `const x = arr[idx]; doSomethingWith(x)` without a null-check between the two lines.

**Phase to address:**
v1.1 Phase 1 (Zero type errors). Fix these before any other work since they block `tsc --noEmit` from producing a clean baseline.

---

### Pitfall 13: Migration Folder Restructuring Breaks Import Paths Silently

**What goes wrong:**
Moving `src/migrate/*.ts` files into `src/migrate/v2/*.ts` changes all relative import paths. There is exactly one inbound import in the production code: `src/commands/migrate/index.ts` imports `../../migrate/run-migration.js`. Tests in `tests/integration/golden/migrate.spec.ts` do not directly import from `src/migrate/` — they invoke the CLI via `runCli()` and check filesystem side effects. However, if any new test or helper imports `src/migrate/run-migration.ts` directly (common during restructuring), those imports break silently at runtime (not at compile time) because `tsconfig.json` excludes `tests/` from the TypeScript project. The `node --import tsx/esm` test runner will produce `MODULE_NOT_FOUND` at runtime rather than a compile-time error.

The second risk is forgetting to update the single inbound production import when moving files.

**Why it happens:**
Two factors combine:
1. TypeScript `exclude: ["tests"]` in tsconfig means test files are not type-checked, so a broken import in a test file won't appear in `tsc --noEmit`.
2. Developers restructure the folder, update the single obvious import, and miss any test-side direct imports added during the restructure.

**How to avoid:**
- Before restructuring, run `grep -r "from.*migrate" src/ tests/` to enumerate all inbound imports across both source and tests.
- Restructure in a single atomic step: move files, update all import paths, run `pnpm test` to confirm green.
- Keep the `src/migrate/run-migration.ts` entry point in place as a thin re-export barrel during the transition if there are multiple consumers: `export { runV2Migration } from './v2/run-migration.js'`.
- After restructuring, verify `tsc --noEmit` is still clean (it will not catch test imports, but it will catch any missed source import).

**Warning signs:**
- Any file in `tests/` that directly imports from `../../src/migrate/` — these are invisible to tsc but will fail at test runtime.
- A restructuring PR that only updates `src/commands/migrate/index.ts` without searching tests for direct migrate imports.
- Tests pass locally in an IDE that has a cached module graph but fail in CI on a clean install.

**Phase to address:**
v1.1 Phase 2 (Migration architecture restructuring). Run a full grep audit before moving any file.

---

### Pitfall 14: Biome→oxfmt Switch — Formatting Divergence Diffs All Source Files

**What goes wrong:**
Biome and oxfmt are both Prettier-compatible formatters, but they diverge on trailing commas, import grouping order, and a few other rules. Switching formatters mid-project produces a large reformatting diff that pollutes `git blame`, makes code review harder, and can introduce whitespace-only conflicts with in-progress branches. If the switch happens in the same commit or PR as functional changes (restructuring, type fixes), it becomes impossible to verify that no logic changed — the diff noise hides the signal.

The second risk: the CI lint check (`pnpm lint`) currently runs `biome check`. After the switch, CI must run `oxlint` for linting and `oxfmt --check` for formatting. Forgetting to update the CI command means the old Biome check passes against old Biome-formatted files, then `oxfmt --check` fails on the next PR that changes any file.

**Why it happens:**
- Formatter switches are often treated as "cosmetic" changes that don't need their own isolated commit/PR.
- oxfmt's `--migrate biome` command converts configuration but does not automatically reformat all files in one shot — developers must run `oxfmt --write` separately.
- oxlint covers only a subset of Biome's lint rules. Rules that existed in Biome but have no oxlint equivalent will silently disappear.

**How to avoid:**
1. Dedicate one commit exclusively to the formatter switch: remove `@biomejs/biome`, add `oxfmt` + `oxlint`, run `oxfmt --write` on all source files, update `package.json` scripts and CI configuration. No functional changes in this commit.
2. Run `oxfmt --migrate biome` to convert `biome.json` to `.oxfmtrc.json` — do not hand-edit the config.
3. Audit Biome lint rules in `biome.json` against oxlint's supported rules list; explicitly document any rules that have no oxlint equivalent and decide whether to accept the gap.
4. Update the `lint` and `format` scripts in `package.json` atomically with the switch:
   - `"lint": "oxlint src/ tests/ bin/"` (replaces `biome check .`)
   - `"format": "oxfmt --write"` (replaces `biome format --write .`)

**Warning signs:**
- The formatter switch and migration restructuring are in the same PR.
- `package.json` still has `biome check` in the `lint` script after oxfmt/oxlint are installed.
- `node_modules/@biomejs/biome` is still present after switching (indicates devDependency not removed).
- CI shows no `oxfmt --check` step even though the switch has been made.

**Phase to address:**
v1.1 Phase 3 (Tooling switch). Isolated, single-purpose commit — no other changes mixed in.

---

### Pitfall 15: starters/ Folder Not Included in npm Tarball — The gitignore Override Gap

**What goes wrong:**
npm's `files` field in `package.json` is additive against `.gitignore` — files listed in `files` are included even if `.gitignore` would exclude them. However, this only applies to the entries in `files` themselves; **subdirectory contents** still follow npm's own ignore rules unless explicitly listed. The current `package.json` has `"files": ["dist", "stubs"]`. Adding `"starters"` to this array should include the starters folder, but there are two traps:

1. **No .npmignore + .gitignore presence**: npm uses `.gitignore` as a fallback when no `.npmignore` exists. If `starters/` is not in `.gitignore` and is listed in `files`, it should be included — but any `node_modules/` directories nested inside starter templates (e.g., if any fixture has been `npm install`-ed) will be excluded by npm's built-in rules, potentially corrupting starter templates that declare their own `package.json`.

2. **Tarball size**: 15 adapters + 6 apps + 22 features = potentially hundreds of template files. The entire `starters/` tree must be in the tarball. Running `npm pack --dry-run` will show the included file list and total size. A common mistake is running `npm publish` without checking the tarball first and shipping either a too-large package (if node_modules leaked) or a too-small one (if a pattern inadvertently excluded files).

3. **Nested `.gitignore` files in starter templates**: Starter templates often include their own `.gitignore` files (e.g., `starters/apps/base/.gitignore` contains `node_modules/`, `dist/`). npm respects nested `.gitignore` files when building the tarball, which means `starters/apps/base/dist/` would be excluded even if it should be included in the template.

**Why it happens:**
npm's file inclusion rules have multiple layers (the `files` field, root `.gitignore`, nested `.gitignore`, built-in always-ignore list) and the interaction between them is non-obvious. Developers assume "listed in `files` means included, full stop."

**How to avoid:**
1. Add `"starters"` to the `files` array in `package.json`.
2. Run `npm pack --dry-run 2>&1 | grep -E "^npm notice"` to inspect every file that would be included and verify the starters tree is present.
3. If starter templates have nested `.gitignore` files that exclude directories needed in the template, add a `.npmignore` file at the repo root to override — an `.npmignore` at root takes precedence over `.gitignore`. Alternatively, add the specific directories to the `files` field: `"starters/apps/base/dist"`.
4. Verify tarball size is reasonable before publishing (a starters tree of this size should be under 5MB uncompressed).

**Warning signs:**
- `npm pack --dry-run` output does not list files from `starters/`.
- Starter templates contain their own `.gitignore` files with `dist/` exclusions.
- Published package installs correctly but `loadIntegrations()` returns empty array (starters missing from tarball).
- `npm pack` produces a `.tgz` file substantially smaller than expected.

**Phase to address:**
v1.1 Phase 4 (Starters integration). Run `npm pack --dry-run` as part of the acceptance criteria checklist.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `process.cwd()` as project root in all commands | Avoids `rootDir` discovery logic, ships faster | Breaks for pnpm workspace monorepos where user runs from repo root (OQ-02); `package.json` operations target the wrong file | Never for destructive commands (`qwik upgrade`); acceptable for read-only commands |
| Skipping OQ-06 (global identifier rename scope) | Avoids scope analysis complexity in oxc reimplementation | False-positive renames on local variables; semantically corrupt output that passes syntax checks | Never — must have at least one collision fixture test before shipping `qwik upgrade` |
| Baking `@qwik.dev/core` version at build time in starters | Zero runtime complexity | Stale starter templates on every release gap; immediate user friction | Never for standalone package; acceptable inside monorepo only |
| Copying `__dirname`-relative path resolution from the original source | Fastest path to parity for file discovery | Breaks silently when imported as a package (EB-01); `starters/` not found | Never — the extraction is the entire purpose of the project |
| Keeping `CODE_MOD` as a global constant with a hardcoded value | Avoids refactoring `updateApp()` signature | Wrong behavior in scaffolding flow if `updateApp()` is shared; vite configs corrupted on `create-qwik` | Never for standalone package |
| Deferring `visitNotIgnoredFiles` `.git/` guard to "later" | Ships OQ-07 faster | Silent `.git/` corruption on projects with no `.gitignore`; lost commit history | Never — trivial to add, catastrophic to omit |
| Not adding cross-package import normalization before implementation | Saves a one-time cleanup pass | Bulk search/replace during import boundary switch requires two grep patterns; risk of missing one form | Acceptable if IMPL-01 is tracking both forms explicitly |
| Using `as string` to suppress `noUncheckedIndexedAccess` errors | Fast "fix" for TS18048 errors | Hides real null-path at runtime; `args[idx + 1]` can still be `undefined` | Never — use a guard or non-null assert with explanation |
| Mixing formatter switch commit with functional changes | Saves one PR | Git blame becomes unreliable; code review cannot distinguish logic changes from formatting changes | Never — formatter switches must be isolated commits |
| Not running `npm pack --dry-run` before first publish with starters | Saves one verification step | Starters missing from tarball; CLI installs but template loading silently broken | Never — takes 5 seconds and prevents a botched publish |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `npm dist-tag` version query | Substituting `pnpm dist-tag` or `yarn info` because the project uses pnpm/yarn | `npm dist-tag @qwik.dev/core` is hardcoded intentionally — npm is the canonical registry query tool; other PMs have different output formats. Must use `npm` or update the parser. |
| oxc-parser identifier binding | Using text-match rename (same bug as ts-morph) instead of binding-scoped rename | Resolve the import binding from the AST node, collect only its references via scope walk, not all identifiers with matching text |
| oxc-parser `ModuleExportName` union | Accessing `.name` directly on `specifier.imported` | Narrow the union: `specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value` |
| `@clack/prompts` spinner in migration | Starting a spinner, then the step throws — spinner never stops | Always wrap spinner start/stop in try/finally; a hanging spinner leaves the terminal in broken state |
| tsdown dual output | Omitting `exports` field or using only `main`/`module` | Configure `exports` with `import` / `require` conditions; Node's module resolution uses `exports` for ESM-aware resolution; `main`/`module` alone is insufficient for ESM consumers |
| Template distribution (`stubs/`) | Forgetting to include `stubs/` in the `files` field of `package.json` | Add `stubs/` to `package.json` `files`; tsdown/tsc do not copy non-source assets; they must be explicitly included in the published package |
| oxfmt migration from biome | Running `oxfmt --migrate biome` without also updating `package.json` scripts and CI | Migration command converts config only; scripts (`lint`, `format`) and CI commands must be manually updated to reference oxlint/oxfmt |
| `@clack/prompts` `exactOptionalPropertyTypes` | Passing `initialValue: undefined` when `undefined` is not an option | Use conditional spread: `...(val !== undefined ? { initialValue: val } : {})` |
| cross-spawn with possibly-undefined executor | Passing `pm === "npm" ? "npx" : pm` where `pm` can be `undefined` | Guard: `if (!pm) throw ...` before using `pm` as executor |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| ts-morph loading all `.ts`/`.tsx` files for every round | Migration slows proportionally to project size; 3 sequential `new Project()` loads per run | oxc-parser replacement solves this; oxc is significantly faster and does not require a full TS project load | Any project with 100+ TypeScript files |
| `execSync('npm dist-tag ...')` blocking the event loop | Hangs visibly when npm or network is slow; no timeout | Acceptable for a one-time CLI migration step; document that npm must be available on PATH | Any environment where npm is not on PATH (e.g., projects using only pnpm/bun with `--ignore-scripts`) |
| `visitNotIgnoredFiles` symlink traversal | Migration descends into linked `node_modules/` or workspace siblings; runs indefinitely or modifies files outside project | Use `lstat` and explicitly skip symlinks, or add symlink traversal depth limit. OQ-07 must be addressed. | Any project with workspace symlinks or manually created symlinks |
| Large `starters/` tree in npm tarball | `npm install @qwik.dev/cli` is slow for users who only want CLI commands (not scaffolding) | Accept: starters are required for `create-qwik`; ensure no `node_modules/` directories leak into tarball | First install on slow connections if tarball exceeds ~5MB |

---

## "Looks Done But Isn't" Checklist

- [ ] **Template resolution:** `stubs/` directory is included in the npm `files` field AND resolves correctly when the package is installed in `node_modules/` — verify by running `npm pack` and inspecting the tarball, then installing locally.
- [ ] **Version in scaffolded project:** A project scaffolded with `create-qwik` has the *installed* version of `@qwik.dev/core` in its generated `package.json`, not a stale build-time constant.
- [ ] **`qwik migrate-v2` alias:** `qwik migrate-v2` routes to the same behavior as `qwik upgrade` — both commands must be registered.
- [ ] **`qwik version` output:** Bare semver string (no label, no prefix) — IDE extensions parse this; any label addition is a silent breaking change.
- [ ] **`qwik --version` flag:** Both `qwik version` and `qwik --version` produce identical output — required for IDE extension compatibility (OQ-04).
- [ ] **Exit code on cancel:** Ctrl-C or interactive "no" selection exits with code 0, not 1 — scripts that check exit codes must not flag cancellation as failure.
- [ ] **Binary/lockfile exclusion in upgrade:** Lockfiles (`yarn.lock`, `pnpm-lock.yaml`, `package-lock.json`, `bun.lockb`) and `CHANGELOG.md` are not modified by the text-replace step.
- [ ] **`.git/` exclusion without `.gitignore`:** Running `qwik upgrade` in a project with no `.gitignore` does not write any file under `.git/`.
- [ ] **Unescaped regex in `replaceMentions`:** The regex `new RegExp(oldPackageName, 'g')` contains `.` (in `@builder.io`) which matches any character. While benign in practice for these specific strings, the reimplementation should escape dots or use a literal string match.
- [ ] **Dual output imports resolve:** ESM consumer can `import` the CLI package and CJS consumer can `require` it — both code paths resolve correctly with proper `exports` conditions in `package.json`.
- [ ] **Type baseline clean:** `tsc --noEmit` exits 0 before any migration restructuring begins — 13 existing errors must be resolved first.
- [ ] **oxlint replaces all Biome lint rules:** Audit `biome.json` lint rules against oxlint rule list; document any rules dropped in the switch.
- [ ] **starters/ in npm tarball:** `npm pack --dry-run` shows all files in `starters/adapters/`, `starters/apps/`, `starters/features/`, `starters/templates/` (expected: 15 + 6 + 22 + N entries).
- [ ] **Migration v2/ folder import paths:** After restructuring `src/migrate/` → `src/migrate/v2/`, `tsc --noEmit` still exits 0 and all tests pass.
- [ ] **Biome fully removed:** `node_modules/@biomejs/biome` absent, `biome.json` deleted, no `biome` references in `package.json` scripts after switch.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Asset path breaks on install | HIGH | Audit all `__dirname`/`import.meta.url` path resolutions, move assets into `stubs/`, rebuild and republish |
| `CODE_MOD` wrong value in scaffolding | HIGH | Emergency patch release; users who scaffolded with corrupted vite configs must manually revert them |
| Identifier over-rename in upgrade (OQ-06) | HIGH | Users must manually diff their codebase and revert false-positive renames; no automated recovery |
| `.git/` corruption from no-.gitignore run | HIGH | Users must restore from backup or re-clone; there is no programmatic recovery for corrupted git objects |
| Stale starter versions | LOW | Patch release with corrected version injection; users re-scaffold or manually update `package.json` |
| Undeclared runtime dependencies | MEDIUM | Patch release declaring deps; users who hit install failures unblock by running the fixed version |
| Package rename wrong order (substring corruption) | HIGH | Users must manually replace corrupted package names; no automated fix available for partially-migrated projects |
| oxc-parser `.name` on StringLiteral (runtime) | MEDIUM | Fix narrowing in `replaceImportInFiles`, republish; users re-run migration (idempotent for already-correct imports) |
| exactOptionalPropertyTypes errors suppressed with `as` | MEDIUM | Audit all `as string` casts on optional fields, replace with guards; requires careful regression testing |
| starters/ missing from tarball | MEDIUM | Publish patch with corrected `files` field; users who installed broken version must reinstall |
| Formatter switch mixed with logic changes | LOW | Cherry-pick the functional changes onto a new branch, re-apply formatter separately; rewrites git history |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Asset path resolution (`__dirname` trap) | Phase 1 — Repository scaffold; establish `stubs/` layout | `npm pack` the package, install it in an isolated temp dir, run `create-qwik` and assert starter templates load |
| `CODE_MOD` global gate | Phase 1 — Audit before first command; refactor `updateApp()` signature | Unit test: call `updateApp({ applyViteConfig: false })` and assert `updateViteConfigs` is not invoked |
| AST global identifier rename (OQ-06) | IMPL-02 — `qwik upgrade`; add collision fixture before codemod is written | Test fixture with local variable `const jsx = otherLib.jsx`; assert output is unchanged |
| Package rename ordering | IMPL-02 — `qwik upgrade`; encode ordering as test | Test: wrong-order run produces corrupt names; correct-order run produces correct names |
| Transient ts-morph lifecycle | IMPL-02 — Confirm oxc-parser replaces ts-morph entirely | Verify `ts-morph` does not appear in package.json after upgrade completes on a project that didn't have it |
| `.gitignore` absence + `.git/` traversal (OQ-07) | IMPL-02 — `visitNotIgnoredFiles` reimplementation | Test: upgrade on project with no `.gitignore`; assert no write to `.git/**` |
| Stale starter versions (EB-05) | Scaffolding phase — `create-qwik` implementation | Integration test: scaffold project, check generated `package.json` version matches the installed `@qwik.dev/core` version |
| Undeclared runtime deps (EB-07) | Phase 1 — Repository scaffold; `package.json` manifest | CI: run `npm ci --only=production` in a clean environment and assert the CLI starts without module-not-found errors |
| `qwik version` / `--version` output format (OQ-04) | IMPL-01 — CLI extraction; `version` command implementation | Golden test: `qwik version` output matches `/^\d+\.\d+\.\d+$/`; no label prefix |
| `qwik migrate-v2` alias (backward compat) | IMPL-01 — command registration | Test: `qwik migrate-v2` and `qwik upgrade` both invoke the same handler |
| oxc-parser ModuleExportName `.name` trap | v1.1 Phase 1 — Zero type errors | `tsc --noEmit` exits 0; add string-literal import fixture test to rename-import suite |
| exactOptionalPropertyTypes (4 instances) | v1.1 Phase 1 — Zero type errors | `tsc --noEmit` exits 0 with no `TS2375`/`TS2379` errors; conditional spread pattern in console.ts wrappers |
| cross-spawn undefined executor | v1.1 Phase 1 — Zero type errors | `tsc --noEmit` exits 0 on update-app.ts; guard present with explicit error message |
| noUncheckedIndexedAccess array access | v1.1 Phase 1 — Zero type errors | `tsc --noEmit` exits 0 with no `TS18048`/`TS2722` errors |
| Migration restructuring breaks import paths | v1.1 Phase 2 — Migration architecture | `grep -r "from.*migrate" src/ tests/` audit before moving; `pnpm test` green after restructure |
| Biome→oxfmt formatting divergence | v1.1 Phase 3 — Tooling switch | Single isolated commit; `oxfmt --check` passes in CI; no Biome references remain |
| starters/ missing from npm tarball | v1.1 Phase 4 — Starters integration | `npm pack --dry-run` lists all starter files; local install smoke test runs `qwik add` and lists integrations |

---

## Sources

- Live `tsc --noEmit` output on qwik-cli source at `/Users/jackshelton/dev/open-source/qwik-cli/` (HIGH confidence — direct observation)
- oxc-parser v0.123 runtime inspection: `parseSync` output for `Identifier` vs `StringLiteral` module export names (HIGH confidence — live Node.js execution)
- oxc-parser `src-js/generated/deserialize/js.js` source: `deserializeStringLiteral` uses `.value` not `.name` (HIGH confidence — source inspection)
- `specs/OPEN-QUESTIONS.md` — 7 open questions and 7 extraction blockers, verified against branch `build/v2` commit `bfe19e8d9` (HIGH confidence)
- `specs/COUPLING-REPORT.md` — Full coupling analysis of create-qwik ↔ qwik CLI, verified from source (HIGH confidence)
- `specs/MIG-MUTATION-RULES.md` — Complete AST rename and package substitution rules, verified from source (HIGH confidence)
- `specs/MIG-DEPS-AND-UPGRADE.md` — ts-morph lifecycle, dist-tag resolution, `qwik upgrade` compatibility contract (HIGH confidence)
- [Oxfmt Beta announcement — oxc.rs](https://oxc.rs/blog/2026-02-24-oxfmt-beta) — `oxfmt --migrate biome` command, configuration, known limitations (HIGH confidence)
- [npm Files & Ignores wiki — github.com/npm/cli](https://github.com/npm/cli/wiki/Files-&-Ignores) — `files` field vs `.gitignore` interaction (HIGH confidence)
- [TypeScript exactOptionalPropertyTypes reference — typescriptlang.org](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html) — absent vs undefined semantics (HIGH confidence)
- [AST-based refactoring with ts-morph — kimmo.blog](https://kimmo.blog/posts/8-ast-based-refactoring-with-ts-morph/) — identifier rename scope risks (MEDIUM confidence)
- [Refactoring with Codemods to Automate API Changes — martinfowler.com](https://martinfowler.com/articles/codemods-api-refactoring.html) — naming conflict handling in codemods (MEDIUM confidence)
- [TypeScript in 2025 with ESM and CJS npm publishing is still a mess — Liran Tal](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) — dual build pitfalls (MEDIUM confidence)
- [Dual publish ESM and CJS with tsdown — DEV Community](https://dev.to/hacksore/dual-publish-esm-and-cjs-with-tsdown-2l75) — tsdown-specific packaging gotchas (MEDIUM confidence)
- [Calling a script with `npm run` sets process.cwd to the top level folder — Shopify CLI issue](https://github.com/Shopify/cli/issues/1186) — process.cwd() behavioral regression patterns (MEDIUM confidence)
- [Understanding __dirname in ES Modules — Medium](https://medium.com/@kishantashok/understanding-dirname-in-es-modules-solutions-for-modern-node-js-9d0560eb5ed7) — import.meta.url resolution mechanics (MEDIUM confidence)

---
*Pitfalls research for: CLI extraction / reimplementation (qwik-cli v1.1)*
*Researched: 2026-04-02 (v1.1 addendum to 2026-04-01 original)*
