# Dependency Cleanup Research: magic-regexp, cross-spawn, yargs

## Summary Table

| Dependency | Version | Import Sites | Test References | Complexity | Recommended Order |
|---|---|---|---|---|---|
| magic-regexp | ^0.11.0 | 5 files | 0 direct | Trivial | 1st |
| cross-spawn | ^7.0.6 | 3 files | 0 direct | Trivial | 2nd |
| yargs | ^18.0.0 | 2 files | 0 direct | Significant | 3rd (or keep) |

**Also remove:** `@types/cross-spawn` (devDependency), `@types/yargs` (devDependency)

---

## 1. magic-regexp

**Package:** `magic-regexp@^0.11.0`
**Purpose:** Readable regex builder. Every usage produces a standard `RegExp` object at runtime.
**Key insight:** All magic-regexp calls are compile-time sugar. Each can be replaced with a native `RegExp` literal with zero behavioral change.

### Site 1: `src/commands/new/templates.ts` (lines 4, 6-8)

**Imports:** `createRegExp`, `exactly`

```typescript
// CURRENT
import { createRegExp, exactly } from "magic-regexp";

export const SLUG_TOKEN = createRegExp(exactly("[slug]"), ["g"]);
export const NAME_TOKEN = createRegExp(exactly("[name]"), ["g"]);
const TEMPLATE_EXT = createRegExp(exactly(".template").and(exactly("").at.lineEnd()));
```

**Analysis:**
- `exactly("[slug]")` with `["g"]` flag -> literal string match, global
- `exactly("[name]")` with `["g"]` flag -> literal string match, global
- `exactly(".template").and(exactly("").at.lineEnd())` -> matches `.template` at end of string. The `exactly("").at.lineEnd()` produces a bare `$` anchor (confirmed per Phase 07 decision).

```typescript
// REPLACEMENT
export const SLUG_TOKEN = /\[slug\]/g;
export const NAME_TOKEN = /\[name\]/g;
const TEMPLATE_EXT = /\.template$/;
```

**Risk:** None. The `[` and `]` characters must be escaped in regex (they are character class delimiters). `exactly()` handles this internally; the native regex needs explicit `\[` and `\]`. The `.` in `.template` must also be escaped.

---

### Site 2: `src/app-command.ts` (lines 3, 19-23)

**Imports:** `createRegExp`, `exactly`, `anyOf`

```typescript
// CURRENT
import { createRegExp, exactly, anyOf } from "magic-regexp";

const matcher = createRegExp(
  exactly("--" + name)
    .at.lineStart()
    .and(anyOf(exactly("="), exactly("").at.lineEnd())),
);
```

**Analysis:**
- `exactly("--" + name).at.lineStart()` -> `^` anchor + literal `--{name}`
- `.and(anyOf(exactly("="), exactly("").at.lineEnd()))` -> followed by either `=` or end-of-string `$`
- Combined: matches `--{name}=` or `--{name}` (at end of string)
- Note: `name` is a dynamic variable, so we cannot use a regex literal; must use `new RegExp()`
- The `name` value comes from CLI flag names (e.g., "force", "installDeps") which are alphanumeric — no regex special characters to escape.

```typescript
// REPLACEMENT
const matcher = new RegExp(`^--${name}(=|$)`);
```

**Risk:** Low. If `name` ever contained regex metacharacters (`.`, `*`, `+`, etc.), the replacement would need escaping. Current usage only passes safe alphanumeric flag names from `getArg()` callsites. Add a comment noting the assumption.

**Edge case:** The original creates a new RegExp on every `getArg()` call (inside a loop over `this.args`). The replacement does too, but the `new RegExp()` is created once per `getArg()` invocation before the loop — same pattern, no performance difference.

---

### Site 3: `migrations/v2/replace-package.ts` (lines 3, 23)

**Imports:** `createRegExp`, `exactly`

```typescript
// CURRENT
import { createRegExp, exactly } from "magic-regexp";

const regex = createRegExp(exactly(oldPkg), ["g"]);
```

**Analysis:**
- `exactly(oldPkg)` with `["g"]` -> global literal match of the package name string
- `oldPkg` values are: `@qwik-city-plan`, `@builder.io/qwik-city`, `@builder.io/qwik-react`, `@builder.io/qwik/jsx-runtime`, `@builder.io/qwik`
- These contain `.` and `/` which are regex metacharacters, but `exactly()` escapes them internally.

```typescript
// REPLACEMENT — Option A: Simple string replace (preferred)
// Since we already check `content.includes(oldPkg)` before replacing,
// and the replacement is a literal string-to-string swap:
const updated = content.replaceAll(oldPkg, newPkg);

// REPLACEMENT — Option B: If regex is needed for some reason
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const regex = new RegExp(escapeRegExp(oldPkg), "g");
```

**Risk:** None with Option A. The code already guards with `content.includes(oldPkg)` before calling `.replace()`. Using `String.prototype.replaceAll()` (available since Node 15) is the cleanest approach and eliminates the regex entirely.

**Recommendation:** Use Option A (`replaceAll`). It is simpler, avoids regex escaping concerns, and Node >=20.19 guarantees `replaceAll` availability.

---

### Site 4: `src/commands/new/parse-input.ts` (lines 1, 3-4)

**Imports:** `createRegExp`, `oneOrMore`, `charIn`, `whitespace`

```typescript
// CURRENT
import { createRegExp, oneOrMore, charIn, whitespace } from "magic-regexp";

const SEPARATOR = createRegExp(oneOrMore(charIn("-_").or(whitespace)));
const SEPARATOR_GLOBAL = createRegExp(oneOrMore(charIn("-_").or(whitespace)), ["g"]);
```

**Analysis:**
- `charIn("-_")` -> character class `[-_]`
- `.or(whitespace)` -> union with `\s` -> `[-_\s]` (per Phase 07 decision: `charIn('-_').or(whitespace)` for character class unions)
- `oneOrMore(...)` -> `+` quantifier
- Combined: `[-_\s]+`
- Non-global version used in `.split()`, global version used in `.replace()`

```typescript
// REPLACEMENT
const SEPARATOR = /[-_\s]+/;
const SEPARATOR_GLOBAL = /[-_\s]+/g;
```

**Risk:** None. Direct 1:1 translation. The `split()` method ignores the `g` flag anyway, and the global version is correctly used with `replace()`.

---

### Site 5: `src/commands/build/index.ts` (lines 4, 76-81)

**Imports:** `createRegExp`, `exactly`, `oneOrMore`, `char`

```typescript
// CURRENT
import { createRegExp, exactly, oneOrMore, char } from "magic-regexp";

const modePattern = createRegExp(
  exactly("--mode=")
    .at.lineStart()
    .and(oneOrMore(char).groupedAs("value"))
    .and(exactly("").at.lineEnd()),
);
const match = arg.match(modePattern);
if (match) {
  mode = match.groups?.value;
}
```

**Analysis:**
- `exactly("--mode=").at.lineStart()` -> `^--mode=`
- `oneOrMore(char).groupedAs("value")` -> `(?<value>.+)` (Phase 07 decision: `char` not `anyChar` for any-character matching)
- `.and(exactly("").at.lineEnd())` -> `$`
- Combined: `^--mode=(?<value>.+)$`

```typescript
// REPLACEMENT
const modePattern = /^--mode=(?<value>.+)$/;
const match = arg.match(modePattern);
if (match) {
  mode = match.groups?.value;
}
```

**Risk:** None. The named capture group `(?<value>...)` is standard ES2018 and fully supported in Node >=20.

---

### magic-regexp Removal Checklist

1. Replace all 5 import sites with native RegExp (code above)
2. Remove `"magic-regexp": "^0.11.0"` from `package.json` dependencies
3. Run `pnpm install` to update lockfile
4. Run full test suite to verify no regressions

**Total complexity:** Trivial. All replacements are mechanical 1:1 translations.

---

## 2. cross-spawn

**Package:** `cross-spawn@^7.0.6` + `@types/cross-spawn` (devDependency)
**Purpose:** Cross-platform `child_process.spawn` that handles Windows cmd.exe quirks (path resolution, argument escaping, PATHEXT).
**Key insight:** With Node >=20.19 as the project floor and `shell: true` on most calls, cross-spawn's value-add is minimal. For non-shell calls, Node's built-in `spawn`/`spawnSync` work identically on macOS/Linux, and the project targets Qwik developers who are overwhelmingly on Unix-like systems.

### Site 1: `src/create-qwik/git-init.ts` (lines 3, 23-38)

**Import:** `spawn` (default import from `cross-spawn`)
**Usage:** `spawn.sync()` (synchronous) -- 3 calls

```typescript
// CURRENT
import spawn from "cross-spawn";

spawn.sync("git", ["init"], { cwd: outDir, stdio: "pipe" });
spawn.sync("git", ["add", "-A"], { cwd: outDir, stdio: "pipe" });
spawn.sync("git", ["commit", "-m", "Initial commit"], { cwd: outDir, stdio: "pipe" });
```

**Analysis:**
- All calls are synchronous (`spawn.sync`)
- No `shell: true` — commands are invoked directly with argument arrays
- `git` is a standard binary on PATH; no Windows PATHEXT resolution needed
- `stdio: "pipe"` suppresses output (git failure is non-fatal)

```typescript
// REPLACEMENT
import { spawnSync } from "node:child_process";

spawnSync("git", ["init"], { cwd: outDir, stdio: "pipe" });
spawnSync("git", ["add", "-A"], { cwd: outDir, stdio: "pipe" });
spawnSync("git", ["commit", "-m", "Initial commit"], { cwd: outDir, stdio: "pipe" });
```

**Risk:** None. `spawnSync` is a direct drop-in. The return value shape (`SpawnSyncReturns`) has the same `.status` property checked by the existing code.

---

### Site 2: `src/integrations/update-app.ts` (lines 3, 60)

**Import:** `spawn` (default import from `cross-spawn`)
**Usage:** `spawn.sync()` (synchronous) -- 1 call

```typescript
// CURRENT
import spawn from "cross-spawn";

spawn.sync(executor, [command, ...args], { cwd, stdio: "inherit" });
```

**Analysis:**
- Synchronous call to run a post-install command (e.g., `npx qwik add`)
- `executor` is `"npx"` or a package manager name (`"pnpm"`, `"yarn"`, `"bun"`)
- `stdio: "inherit"` passes through terminal output
- No `shell: true`

```typescript
// REPLACEMENT
import { spawnSync } from "node:child_process";

spawnSync(executor, [command, ...args], { cwd, stdio: "inherit" });
```

**Risk:** None. Same direct invocation pattern. `npx`, `pnpm`, `yarn`, `bun` are all directly executable binaries.

---

### Site 3: `src/commands/build/index.ts` (lines 3, 20-28, 31-48)

**Import:** `crossSpawn` (default import from `cross-spawn`)
**Usage:** Both sync and async

```typescript
// CURRENT — Synchronous (runSequential)
import crossSpawn from "cross-spawn";

const result = crossSpawn.sync(scriptValue, [], {
  cwd,
  stdio: "inherit",
  shell: true,
});

// CURRENT — Asynchronous (runParallel)
const child = crossSpawn(scriptValue, [], {
  cwd,
  stdio: "inherit",
  shell: true,
});
child.on("close", (code) => { ... });
child.on("error", () => { ... });
```

**Analysis:**
- Both calls use `shell: true`, which means cross-spawn's primary value (Windows cmd.exe shim) is **bypassed**. When `shell: true` is set, Node's native `spawn` already delegates to the system shell.
- `scriptValue` is a shell command string from `package.json` scripts (e.g., `"vite build"`)
- Empty args array `[]` with `shell: true` means the entire command is in `scriptValue`
- The sync call checks `result.status`, the async call listens for `close` and `error` events

```typescript
// REPLACEMENT
import { spawn, spawnSync } from "node:child_process";

// runSequential
const result = spawnSync(scriptValue, [], {
  cwd,
  stdio: "inherit",
  shell: true,
});

// runParallel
const child = spawn(scriptValue, [], {
  cwd,
  stdio: "inherit",
  shell: true,
});
child.on("close", (code) => { ... });
child.on("error", () => { ... });
```

**Risk:** None. With `shell: true`, `node:child_process.spawn` and `node:child_process.spawnSync` are identical in behavior to cross-spawn. The `shell: true` option means Node handles shell invocation natively.

---

### cross-spawn Removal Checklist

1. Replace all 3 import sites with `node:child_process` (code above)
2. Remove `"cross-spawn": "^7.0.6"` from `package.json` dependencies
3. Remove `"@types/cross-spawn": "*"` from `package.json` devDependencies
4. Run `pnpm install` to update lockfile
5. Run full test suite to verify no regressions

**Total complexity:** Trivial. All replacements are mechanical drop-ins.

---

## 3. yargs

**Package:** `yargs@^18.0.0` + `@types/yargs` (devDependency)
**Purpose:** Full-featured CLI argument parser with commands, options, type coercion, help generation, validation.

### Layer A: Direct yargs API Usage

#### Site A1: `src/core.ts` (lines 2-3, 61-78)

**Imports:** `yargs` (default), `hideBin` from `yargs/helpers`

```typescript
// CURRENT
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

protected async parse(argv: string[]): Promise<T> {
  let instance = yargs(hideBin(argv));

  if (this.#commandName) {
    instance = instance.command(this.#commandName, this.#commandDescription) as typeof instance;
  }

  for (const [name, config] of Object.entries(this.#options)) {
    instance = instance.option(name, config) as typeof instance;
  }

  for (const [name, alias] of Object.entries(this.#aliases)) {
    instance = instance.alias(name, alias) as typeof instance;
  }

  const parsed = await instance.parseAsync();
  return parsed as unknown as T;
}
```

**yargs features used:**
1. `yargs(hideBin(argv))` — initialize with `process.argv` minus node/script entries
2. `.command(name, description)` — register a command (used for help text only; routing is done in `router.ts`)
3. `.option(name, config)` — register options with type, default, description, demandOption
4. `.alias(name, alias)` — register flag aliases
5. `.parseAsync()` — parse and return the result object

**What the parsed result looks like:**
- `{ _: string[], [flagName]: string | boolean | number, ... }` — the `_` array contains positional arguments
- Type coercion based on `option.type` (string, boolean, number)
- Default value injection from `option.default`

#### Site A2: `src/create-qwik/run-non-interactive.ts` (lines 4, 22-48)

**Import:** `yargs` (default)

```typescript
// CURRENT
import yargs from "yargs";

const parsed = await yargs(args)
  .command("$0 <template> <outDir>", "Create a new Qwik project")
  .positional("template", {
    type: "string",
    choices: templateIds,
    demandOption: true,
    description: "Starter template to use",
  })
  .positional("outDir", {
    type: "string",
    demandOption: true,
    description: "Output directory for the new project",
  })
  .option("force", {
    type: "boolean",
    alias: "f",
    default: false,
    description: "Overwrite existing directory",
  })
  .option("installDeps", {
    type: "boolean",
    alias: "i",
    default: false,
    description: "Install dependencies after scaffolding",
  })
  .strict()
  .parseAsync();
```

**yargs features used:**
1. `.command("$0 <template> <outDir>", ...)` — define default command with required positional args
2. `.positional(name, config)` — define positional argument with type, choices, validation
3. `.option(name, config)` — define named options with type, alias, default
4. `.choices(array)` — restrict positional values to a specific set
5. `.demandOption(true)` — mark args as required
6. `.strict()` — reject unknown arguments
7. `.parseAsync()` — parse and return result

**This is the most complex yargs usage in the codebase.** It uses positional arguments, choices validation, strict mode, and multiple option types.

---

### Layer B: process.argv Bypass Sites

These files read `process.argv` directly instead of relying on yargs parsing:

#### B1: `src/router.ts` (line 20, 31, 37)

```typescript
const task = process.argv[2];           // Extract command name
await help.run(process.argv);           // Pass full argv to Program.run()
const code = await program.run(process.argv);  // Pass full argv to Program.run()
```

**Purpose:** Router extracts the command name from `argv[2]`, then passes full `process.argv` to `Program.run()` which calls `yargs(hideBin(argv))` internally.

**parseArgs equivalent:** The router does simple positional extraction (`argv[2]`). This is trivial and does not need a parser. If yargs is removed from `Program.parse()`, the router would continue working as-is.

#### B2: `src/commands/build/index.ts` (lines 67-68)

```typescript
const argv = process.argv;
// Scans for --mode flag manually
```

**Purpose:** Manual `--mode` flag extraction because the `BuildProgram.validate()` method needs the mode value. This is a workaround — ideally yargs would parse this, but the code manually scans `process.argv` for `--mode` and `--mode=value`.

**Note:** This is a code smell. If yargs parsing worked correctly for this command, the manual argv scanning would be unnecessary. The `BuildProgram` registers `mode` as an option via `registerOption`, so yargs should parse it. The manual scan may exist as a fallback or because of a timing issue with `validate()` receiving the parsed args.

#### B3: `src/commands/new/index.ts` (lines 27, 33, 40, 70)

```typescript
const { typeArg, nameArg } = inferTypeAndName(process.argv);
const templateId = inferTemplate(process.argv, !!nameArg);
```

**Purpose:** The `NewProgram` uses custom parsing functions (`inferTypeAndName`, `inferTemplate`) that read `process.argv` directly. These functions understand the CLI's specific positional format (`qwik new <name>`) and flag format.

**Note:** This bypasses yargs entirely for the actual business logic. Yargs is only used for its `_` positional array (via `Program.parse()`), but the custom functions re-parse `process.argv` independently.

#### B4: `src/commands/new/parse-input.ts` (line 37+)

```typescript
// inferTypeAndName(args: string[]) takes full argv
const sliced = args.slice(2);  // Same as hideBin
```

**Purpose:** Custom argument parser that slices argv and extracts type/name. Does NOT use yargs at all.

#### B5: `src/core.ts` (line 62)

```typescript
// argv is process.argv: ['node', 'qwik', '<command>', ...flags]
let instance = yargs(hideBin(argv));
```

**Purpose:** This IS the yargs usage — `process.argv` is passed through `hideBin` and into yargs.

#### B6: `src/create-qwik/index.ts` (line 12)

```typescript
const args = process.argv.slice(2);
```

**Purpose:** Slices off node and script args, passes remainder to `runCreateCli(args)` which feeds them to yargs.

---

### Layer C: Replacement Feasibility with `node:util.parseArgs`

**`node:util.parseArgs` API surface (Node >= 18.3):**

```typescript
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    mode: { type: "string", short: "m" },
    force: { type: "boolean", short: "f", default: false },
  },
  allowPositionals: true,
  strict: true,  // reject unknown flags
});
```

**Feature comparison:**

| yargs Feature | Used In Project | parseArgs Support | Gap |
|---|---|---|---|
| `hideBin(argv)` | core.ts | `args: argv.slice(2)` | None |
| `.command(name, desc)` | core.ts, run-non-interactive.ts | Not supported | Must implement manually |
| `.option(name, {type, default})` | core.ts, run-non-interactive.ts | `options: { name: {type, default} }` | Partial (only `string` and `boolean` types) |
| `.alias(name, alias)` | core.ts | `short: "x"` (single char only) | Limited (short alias only, no long aliases) |
| `.positional(name, config)` | run-non-interactive.ts | `allowPositionals: true` + manual extraction | Must validate manually |
| `.choices(array)` | run-non-interactive.ts | Not supported | Must validate manually |
| `.demandOption(true)` | run-non-interactive.ts | Not supported | Must validate manually |
| `.strict()` | run-non-interactive.ts | `strict: true` | Supported |
| `.parseAsync()` | core.ts, run-non-interactive.ts | Synchronous only | Not needed (yargs parseAsync is for middleware) |
| Type coercion (number) | Not used | Not supported | N/A |
| Help text generation | Not explicitly called | Not supported | Must implement manually |
| `_` array (positionals) | core.ts (BuildArgs, NewArgs) | `positionals` array | Different shape |

**Key gaps:**
1. **No command registration** — `parseArgs` does not have a concept of commands. The project already routes commands via `router.ts`, so command registration in yargs is only for help text.
2. **No choices validation** — Used in `run-non-interactive.ts` for template IDs. Must be implemented manually (trivial).
3. **No required argument validation** — `demandOption` must be replaced with manual checks.
4. **No help text generation** — Must be manually maintained (the project's `HelpProgram` already generates custom help text).
5. **Only `string` and `boolean` types** — No `number` type. The project does not use number options, so this is not a gap.
6. **Alias limitations** — `parseArgs` only supports single-character `short` aliases. The project uses `alias("f")` and `alias("i")` which are single-char, so this works.

**Phase 05 decision:** `skipConfirmation` is registered as type `"string"` and compared against exact `"true"` because yargs parses `--flag=true` as the string `"true"` when option type is string. With `parseArgs`, `--flag=true` with type `"string"` would also produce the string `"true"`, so this behavior is preserved.

---

### yargs Replacement Strategy

#### For `src/core.ts` (Program base class):

```typescript
// REPLACEMENT
import { parseArgs } from "node:util";

protected async parse(argv: string[]): Promise<T> {
  const args = argv.slice(2); // equivalent to hideBin

  // Build parseArgs options from registered options
  const options: Record<string, { type: "string" | "boolean"; short?: string; default?: unknown }> = {};

  for (const [name, config] of Object.entries(this.#options)) {
    const paType = config.type === "number" ? "string" : (config.type ?? "string");
    options[name] = {
      type: paType as "string" | "boolean",
      default: config.default,
    };
  }

  // Map aliases to short options (only single-char supported)
  for (const [name, alias] of Object.entries(this.#aliases)) {
    if (alias.length === 1 && options[name]) {
      options[name].short = alias;
    }
  }

  const { values, positionals } = parseArgs({
    args,
    options,
    allowPositionals: true,
    strict: false, // yargs was not strict by default in core.ts
  });

  // Reconstruct yargs-compatible result shape
  return { ...values, _: positionals } as unknown as T;
}
```

**Risk:** Moderate. Every `Program` subclass receives `T` from `parse()`. The `_` positionals array and flag values must match the shape each subclass expects. The `BuildProgram` uses `definition._.includes("preview")` which expects `_` as a string array — `parseArgs` `positionals` is also `string[]`, so this works.

**Concern:** `registerCommand` is currently used but would become a no-op (only used for help text generation, which the project already handles via `HelpProgram`).

#### For `src/create-qwik/run-non-interactive.ts`:

```typescript
// REPLACEMENT
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args,
  options: {
    force: { type: "boolean", short: "f", default: false },
    installDeps: { type: "boolean", short: "i", default: false },
  },
  allowPositionals: true,
  strict: true,
});

const template = positionals[0];
const outDirRaw = positionals[1];

// Manual validation (replaces yargs .demandOption and .choices)
if (!template) {
  throw new Error("Missing required argument: template");
}
if (!templateIds.includes(template)) {
  throw new Error(`Invalid template "${template}". Available: ${templateIds.join(", ")}`);
}
if (!outDirRaw) {
  throw new Error("Missing required argument: outDir");
}

const force = values.force ?? false;
const installDeps = values.installDeps ?? false;
```

**Risk:** Moderate. The current yargs usage provides automatic error messages for missing/invalid positionals. The replacement must replicate these error messages. The error format will differ (yargs produces styled error output; manual throws produce plain text).

---

### yargs Usage Summary

**Total yargs API surface actually used:**

1. `yargs(args)` — initialize parser
2. `hideBin(argv)` — strip node/script from argv
3. `.command()` — register command (for help text only)
4. `.positional()` — define positional args (1 site only)
5. `.option()` — define named options (types: string, boolean)
6. `.alias()` — single-char aliases (f, i)
7. `.choices()` — restrict values (1 site only)
8. `.demandOption()` — required args (1 site only)
9. `.strict()` — reject unknown flags (1 site only)
10. `.parseAsync()` — parse argv

**Features NOT used:** middleware, completion, config files, coerce, count, nargs, array options, conflicts, implies, env vars, locale, wrap, epilogue, example, group, usage string, version, describe, check, fail handler.

---

## 4. Recommended Execution Order

### Priority 1: magic-regexp (Trivial)

**Why first:** Zero risk. Pure mechanical regex literal replacements. No behavioral changes. No API surface changes. Removes 1 dependency + all imports.

**Estimated effort:** 15 minutes
**Complexity:** Trivial
**Dependencies:** None
**Files to modify:** 5 source files + package.json

### Priority 2: cross-spawn (Trivial)

**Why second:** Zero risk with `shell: true` calls. Near-zero risk with direct invocations (git, npx, pnpm). Drop-in replacement with `node:child_process`.

**Estimated effort:** 10 minutes
**Complexity:** Trivial
**Dependencies:** None
**Files to modify:** 3 source files + package.json (2 entries: dep + @types)

### Priority 3: yargs (Significant — evaluate whether to proceed)

**Why last:** Most complex. Touches the `Program` base class which ALL commands inherit from. Requires manual validation for `run-non-interactive.ts`. Error message format changes. Must verify all 8 command subclasses still work.

**Estimated effort:** 1-2 hours
**Complexity:** Significant
**Dependencies:** Depends on magic-regexp removal in build/index.ts (shared file)

**Decision point:** yargs@18 is ESM-native and the only dependency providing real value (argument parsing). Consider whether the reduction in dependencies (1 runtime + 1 @types) justifies the implementation risk and code complexity of manual validation.

**Arguments for keeping yargs:**
- It provides robust argument parsing that `parseArgs` cannot fully replicate
- Error messages are well-formatted and user-friendly
- `.choices()` validation, `.demandOption()`, help generation are non-trivial to replicate
- The project already has 2 layers of custom arg parsing alongside yargs (parse-input.ts, build/index.ts manual argv scan) — removing yargs would add a 3rd custom layer

**Arguments for removing yargs:**
- Only 2 import sites (core.ts, run-non-interactive.ts)
- Most yargs features are unused (see "Features NOT used" list above)
- `node:util.parseArgs` covers 80% of actual usage
- Reduces dependency count and bundle size
- The custom arg parsing in new/parse-input.ts shows the team is comfortable with manual parsing

**Recommendation:** Remove magic-regexp and cross-spawn first. Evaluate yargs removal as a separate decision after those are done. If removing, do it as a carefully tested change with full golden-path test coverage.

---

## 5. Test Impact

### Grep Results

```
grep -rn "magic-regexp\|cross-spawn\|yargs" tests/ --include="*.ts" | grep -v node_modules
```

**Result: 0 matches.** No test files directly import or reference any of the three dependencies.

### Indirect Test Impact

Tests exercise the source files through the CLI interface (golden-path integration tests) and unit tests. Dependency changes are transparent to tests as long as behavior is preserved.

#### magic-regexp removal:
- `tests/unit/create-qwik/createApp.spec.ts` — tests `writeTemplateFile` indirectly; relies on SLUG_TOKEN/NAME_TOKEN behavior
- `tests/integration/golden/new.spec.ts` — tests `qwik new` command; relies on parse-input.ts SEPARATOR behavior
- `tests/integration/golden/build.spec.ts` — tests `qwik build` command; relies on `--mode` pattern matching
- `tests/integration/golden/migrate.spec.ts` — tests migration; relies on `replacePackage` regex behavior
- **Action:** Run full test suite. No test code changes needed.

#### cross-spawn removal:
- `tests/integration/golden/build.spec.ts` — tests build command which spawns subprocesses
- `tests/integration/golden/create-qwik.spec.ts` — tests create-qwik which calls `initGitRepo`
- `tests/integration/golden/add.spec.ts` — tests add command which calls `runPostInstall`
- **Action:** Run full test suite. No test code changes needed.

#### yargs removal:
- `tests/unit/program.spec.ts` — tests `Program.parse()` method directly; **would need updates** if parse return shape changes
- `tests/unit/router.spec.ts` — tests router which calls `Program.run()`
- `tests/unit/app-command.spec.ts` — tests `AppCommand.getArg()` (no yargs dependency)
- `tests/unit/parse-input.spec.ts` — tests parse-input functions (no yargs dependency)
- All integration golden-path tests — exercise commands through full CLI lifecycle
- **Action:** `tests/unit/program.spec.ts` is the highest-risk file. If `parse()` return shape changes (e.g., `_` becomes `positionals`), test assertions must be updated. All golden-path tests should be run to verify end-to-end behavior.

### Test Fixtures and Mocks

No test fixtures or mock files reference these dependencies. Tests use the CLI binary (`runCli` / `runCreateQwik` helpers in `tests/integration/helpers/cli.ts`) which shells out to the actual source files.

---

## Appendix: File-Level Dependency Map

| File | magic-regexp | cross-spawn | yargs |
|---|---|---|---|
| `src/commands/new/templates.ts` | SLUG_TOKEN, NAME_TOKEN, TEMPLATE_EXT | - | - |
| `src/app-command.ts` | getArg matcher | - | - |
| `migrations/v2/replace-package.ts` | replacePackage regex | - | - |
| `src/commands/new/parse-input.ts` | SEPARATOR, SEPARATOR_GLOBAL | - | - |
| `src/commands/build/index.ts` | modePattern | runSequential, runParallel | - |
| `src/create-qwik/git-init.ts` | - | initGitRepo (3 calls) | - |
| `src/integrations/update-app.ts` | - | runPostInstall | - |
| `src/core.ts` | - | - | Program.parse() |
| `src/create-qwik/run-non-interactive.ts` | - | - | runCreateCli parser |
| `package.json` | dep | dep + @types | dep + @types |
