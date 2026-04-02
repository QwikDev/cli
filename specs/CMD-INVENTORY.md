# Qwik CLI — Command Surface Inventory

> Complete catalog of every subcommand the `qwik` binary exposes. A reader can enumerate the full
> command surface, flags, argument signatures, help output format, and version reporting behavior
> without running the CLI.

## Source Files

This document was derived directly from the following source files (commit: `bfe19e8d9`):

| File                                               | Purpose                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `packages/qwik/src/cli/run.ts`                     | Entry point — `COMMANDS` array, `printHelp`, `runCommand` |
| `packages/qwik/src/cli/utils/app-command.ts`       | `AppCommand` class — flag parsing model                   |
| `packages/qwik/src/cli/utils/run-build-command.ts` | `runBuildCommand` — build/preview logic                   |
| `packages/qwik/src/cli/utils/utils.ts`             | `printHeader`, `printVersion`, `pmRunCmd`, `bye`          |
| `packages/qwik/src/cli/add/run-add-command.ts`     | `runAddCommand` — add entry point                         |
| `packages/qwik/src/cli/add/run-add-interactive.ts` | `runAddInteractive` — add flags consumed here             |
| `packages/qwik/src/cli/add/print-add-help.ts`      | `printAddHelp` — add help output                          |
| `packages/qwik/src/cli/new/run-new-command.ts`     | `runNewCommand` — new command logic                       |
| `packages/qwik/src/cli/new/utils.ts`               | `POSSIBLE_TYPES` constant                                 |
| `packages/qwik/src/cli/check-client/index.ts`      | `runQwikClientCommand` — check-client logic               |
| `packages/qwik/src/cli/utils/templates.ts`         | `loadTemplates` — template directory loading              |

---

## Binary Entry Point

**Binary file:** `packages/qwik/src/cli/qwik.mjs`

- Shebang: `#!/usr/bin/env node`
- Imports `./cli.mjs` and calls `runCli()`

**`runCli()` (in `run.ts`):**

```
1. printHeader()                        // Print ASCII art logo (always)
2. new AppCommand({
     rootDir: '',
     cwd: process.cwd(),
     args: process.argv.slice(2)
   })
3. await runCommand(app)                // Dispatch on app.task
4. catch (e) → panic(String(e))        // prints ❌ + red message + process.exit(1)
```

**`runCommand(app)` dispatch:**

- `app.task` = `app.args[0]` = `process.argv[2]`
- Matched via `switch (app.task)` against the exact string values in the `COMMANDS` array
- Unrecognized task:
  ```
  console.log(red(`Unrecognized qwik command: ${app.task}`) + '\n')
  await printHelp(app)
  process.exit(1)
  ```
- No task supplied (`app.task` = `undefined`): falls through switch, prints help + exits 1

---

## Flag Parsing Model

**Class:** `AppCommand` (`packages/qwik/src/cli/utils/app-command.ts`)

**Constructor:**

```typescript
constructor(opts: { rootDir: string; cwd: string; args: string[] }) {
  this._rootDir = opts.rootDir;
  this.cwd = opts.cwd;
  this.args = opts.args.slice();   // copy of argv.slice(2)
  this.task = this.args[0];        // first positional = subcommand name
}
```

**`getArg(name: string): string | undefined`:**

```
key     = '--' + name
matcher = /^--name($|=)/     // anchored prefix match

1. Find first arg matching matcher (index)
2. If not found → return undefined
3. If arg contains '=' → return arg.split('=')[1]   (--name=value form)
4. Else → return args[index + 1]                     (--name value form)
```

**Supported flag forms:**

- `--name value` — space-separated; next element in args array is the value
- `--name=value` — equals-separated; value is after the `=`

**Not supported:**

- Short flags (`-n`) — no short flag handling anywhere in the CLI
- Combined short flags (`-abc`)
- Flags with multiple values

**`rootDir` lazy resolution (getter):**

If `_rootDir` is empty string (as set by `runCli`), the getter walks up from `process.cwd()` up to 20 directories looking for the nearest `package.json`. Throws `"Unable to find Qwik app package.json"` if none found.

---

## Subcommands

### Complete Subcommand Table

All 9 registered commands from the `COMMANDS` array in `run.ts`:

| `value`         | `showInHelp` | Positional Args                                                                                                                       | Flags                                                                                                                                               | Hint                                                                 |
| --------------- | :----------: | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `add`           |     yes      | `args[1]`: integration id (optional); literal `'help'` → prints add-help instead                                                      | `--skipConfirmation=true` (skip confirm-before-commit prompt); `--projectDir=<path>` (override write directory)                                     | Add an integration to this app                                       |
| `build`         |     yes      | none                                                                                                                                  | `--mode <value>` (forwarded as `--mode <value>` to `build.client`, `build.lib`, `build.server`; not forwarded to `build.preview` or `build.static`) | Parallelize builds and type checking                                 |
| `build preview` |     yes      | none (preview mode activated by `app.args.includes('preview')`)                                                                       | `--mode <value>` (forwarded to `build.preview` and `build.lib`)                                                                                     | Same as "build", but for preview server                              |
| `new`           |     yes      | `args[1..]` joined (after stripping `--` flags) = `mainInput`; type and name inferred — see [Subcommand Details](#subcommand-details) | `--<templateId>` (selects template by id, e.g. `--qwik`; default `'qwik'` when positional provided)                                                 | Create a new component or route                                      |
| `joke`          |     yes      | none                                                                                                                                  | none                                                                                                                                                | Tell a random dad joke                                               |
| `migrate-v2`    |    **no**    | none                                                                                                                                  | none                                                                                                                                                | Rescopes the application from @builder.io/_ namespace to @qwik.dev/_ |
| `check-client`  |     yes      | `args[1]`: src directory path (required); `args[2]`: dist directory path (required)                                                   | none                                                                                                                                                | Make sure the client bundle is up-to-date with the source code       |
| `help`          |    **no**    | none                                                                                                                                  | none                                                                                                                                                | Show this help                                                       |
| `version`       |    **no**    | none                                                                                                                                  | none                                                                                                                                                | Show the version                                                     |

### Subcommand: `add`

**Entry:** `runAddCommand(app)` in `add/run-add-command.ts`

```
id = app.args[1]
if id === 'help' → printAddHelp(app)   // lists adapters + features, then interactive select
else             → runAddInteractive(app, id)
```

**Flags consumed in `runAddInteractive`:**

| Flag                 | Form                                           | Behavior                                                                                                         |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--skipConfirmation` | `--skipConfirmation=true`                      | When value is `'true'`, skips the `logUpdateAppResult` confirm-before-commit prompt; commit runs unconditionally |
| `--projectDir`       | `--projectDir=<path>` or `--projectDir <path>` | Passed as `updateAppOptions.projectDir`; overrides where integration files are written                           |

**`printAddHelp` output:**

- `intro`: `{pmRun} qwik add [integration]`
- `note` titled `'Adapters'`: one line per adapter integration (`SPACE_TO_HINT = 25`, `MAX_HINT_LENGTH = 50`)
- `note` titled `'Features'`: one line per feature integration
- `confirm`: `'Do you want to install an integration?'` (initialValue: `true`)
- If confirmed: `select` titled `'Select an integration'` showing all integrations

### Subcommand: `build`

**Entry:** `runBuildCommand(app)` in `utils/run-build-command.ts`

**Script discovery** (from `app.packageJson.scripts`):

| Script key      | When run                                                             |
| --------------- | -------------------------------------------------------------------- |
| `build.types`   | Always (run in parallel with others)                                 |
| `build.client`  | Always (required; throws if missing and `build.lib` absent)          |
| `build.lib`     | When present (library mode)                                          |
| `build.server`  | When NOT preview build                                               |
| `build.preview` | When IS preview build (`args.includes('preview')`)                   |
| `build.static`  | When present (SSG)                                                   |
| `ssg`           | After static build in preview mode                                   |
| `lint`          | When present                                                         |
| `prebuild.*`    | All `prebuild.`-prefixed scripts, run sequentially BEFORE main build |
| `postbuild.*`   | All `postbuild.`-prefixed scripts, run sequentially AFTER main build |

**`--mode` flag behavior:**

`app.getArg('mode')` retrieves value. Passed via `attachArg(script, 'mode', mode)` which appends `--mode <value>` to the script command string. Applied to: `build.client`, `build.lib`, `build.preview`, `build.server`.

**Preview build detection:** `app.args.includes('preview')` — value literal `'preview'` anywhere in args array.

**Execution order:**

1. Sequential: all `prebuild.*` scripts
2. `build.client` (sequential, must complete first)
3. Parallel: `build.lib`, `build.preview` OR `build.server`, `build.static`, `build.types`, `lint`
4. Sequential: all `postbuild.*` scripts

### Subcommand: `build preview`

Same handler as `build` (`runBuildCommand`). Distinction: `app.args.includes('preview')` is `true` because `'preview'` is in args (it's `args[1]`). This causes `build.preview` to run instead of `build.server`.

### Subcommand: `new`

See [Subcommand Details — qwik new](#qwik-new--argument-inference-rules) for full inference logic.

**Help trigger:** `app.args[1] === 'help'` → prints new help and exits.

### Subcommand: `joke`

**Entry:** `runJokeCommand()` in `joke/run-joke-command.ts`. No args or flags consumed.

### Subcommand: `migrate-v2`

**Entry:** `runV2Migration(app)` in `migrate-v2/run-migration.ts`. Not shown in help output. Rescopes `@builder.io/*` → `@qwik.dev/*` namespace.

### Subcommand: `check-client`

**Entry:** `runQwikClientCommand(app)` in `check-client/index.ts`

```typescript
const src = app.args[1]; // source directory path (positional, required)
const dist = app.args[2]; // dist directory path (positional, required)
await checkClientCommand(app, src, dist);
```

**Logic:**

1. If `dist` directory does not exist → run `build.client` script
2. If `dist/q-manifest.json` does not exist or cannot be read → run `build.client` script
3. If any file under `src` has `mtimeMs > manifest.mtimeMs` → run `build.client` script
4. Otherwise → no-op (client is up to date)

No flags are consumed.

### Subcommand: `help`

**Entry:** `printHelp(app)` (defined in `run.ts`). Not shown in help output. See [Help Output Format](#help-output-format).

### Subcommand: `version`

**Entry:** `printVersion()` (defined in `run.ts`). Not shown in help output. See [Version Reporting](#version-reporting).

---

## Help Output Format

`printHelp(app)` in `run.ts`. Renders an interactive Clack prompt sequence.

**Constant:** `SPACE_TO_HINT = 18`

### Rendering sequence

**Step 1 — intro:**

```
🔭  [Qwik Help]         (label rendered in bgMagenta via kleur/colors)
```

Code: `intro(`🔭 ${bgMagenta(' Qwik Help ')}`)

**Step 2 — note block titled `'Available commands'`:**

One line per command where `showInHelp: true` (7 commands: `add`, `build`, `build preview`, `new`, `joke`, `check-client`, and no others — `migrate-v2`, `help`, `version` are excluded).

Line format per command:

```
{pmRun} qwik {cyan(label)}{padding}{dim(hint)}
```

Padding formula:

```
' '.repeat(Math.max(SPACE_TO_HINT - cmd.label.length, 2))
```

- Minimum 2 spaces always enforced (even if label is longer than 18 chars)
- `SPACE_TO_HINT = 18` measures from start of label, not from start of line

`pmRun` values:

- If package manager is `npm` → `'npm run'`
- Otherwise → package manager name (e.g. `'pnpm'`, `'yarn'`, `'bun'`)

Package manager detected via `detectPackageManager()?.name || 'pnpm'` (from `which-pm-runs` package).

Example lines (using `pnpm`):

```
pnpm qwik add                 Add an integration to this app
pnpm qwik build               Parallelize builds and type checking
pnpm qwik build preview       Same as "build", but for preview server
pnpm qwik new                 Create a new component or route
pnpm qwik joke                Tell a random dad joke
pnpm qwik check-client        Make sure the client bundle is up-to-date with the source code
```

**Step 3 — confirm prompt:**

```
message:      'Do you want to run a command?'
initialValue: true
```

**Step 4 — if cancelled or answered `false`:**

```
bye() → outro('Take care, see you soon! 👋') + process.exit(0)
```

**Step 5 — if confirmed (`true`):**

`select` prompt:

```
message: 'Select a command'
options: same showInHelp: true commands, each with:
  value: cmd.value       // e.g. 'add', 'build', 'build preview'
  label: '{pmRun} qwik {cyan(cmd.label)}'
  hint:  cmd.hint
```

**Step 6 — after select:**

If cancelled → `bye()`

If selected → splits selected value on `' '`, re-dispatches:

```typescript
const args = (command as string).split(" ");
await runCommand(Object.assign(app, { task: args[0], args }));
```

Note: `build preview` value splits to `['build', 'preview']` → `task = 'build'`, `args = ['build', 'preview']`, which causes `args.includes('preview')` to be true in `runBuildCommand`.

---

## Version Reporting

**Command:** `qwik version`

**Handler:** `printVersion()` in `run.ts`

```typescript
function printVersion() {
  console.log((globalThis as any).QWIK_VERSION);
}
```

**Output:** A single line to stdout containing the version string (e.g. `2.0.0`). No trailing text, no labels, no prefix.

**Source of `QWIK_VERSION`:** Injected at **build time** by esbuild/rollup `define` configuration — not read from `package.json` at runtime, not from `process.env`. The value is embedded directly into the compiled `cli.mjs` bundle.

**Visibility:** `showInHelp: false` — does not appear in help output or interactive select.

---

## printHeader Output

`printHeader()` in `utils/utils.ts`. Called unconditionally before every command (including `version`).

**Output:** ASCII art logo printed to `console.log` using `kleur/colors`. Blue outer frame, magenta inner dots:

```
      ............
    .::: :--------:.
   .::::  .:-------:.
  .:::::.   .:-------.
  ::::::.     .:------.
 ::::::.        :-----:
 ::::::.       .:-----.
  :::::::.     .-----.
   ::::::::..   ---:.
    .:::::::::. :-:.
     ..::::::::::::
             ...::::
```

Color coding:

- Outer geometry (`.`, `:`, spaces): **blue** (`blue()` from kleur)
- Inner dots pattern: **magenta** (`magenta()` from kleur)

Followed by a blank line (`'\n'` as second argument to `console.log`).

---

## Subcommand Details

### qwik new — Argument Inference Rules

Full specification of the non-obvious type, name, and template inference logic in `runNewCommand`.

#### Positional → Type Inference

```
args            = app.args               // argv.slice(2), e.g. ['new', '/foo/bar', '--qwik']
nonFlagArgs     = args.filter(a => !a.startsWith('--'))
mainInput       = nonFlagArgs.slice(1).join(' ')   // everything after 'new', no flags

if mainInput starts with '/':
  if mainInput ends with '.md'  → typeArg = 'markdown', nameArg = mainInput.replace('.md', '')
  if mainInput ends with '.mdx' → typeArg = 'mdx',      nameArg = mainInput.replace('.mdx', '')
  else                           → typeArg = 'route',    nameArg = mainInput

else if mainInput is non-empty (does not start with '/'):
  typeArg = 'component',  nameArg = mainInput

else (mainInput is empty):
  typeArg = undefined → interactive prompt: select from POSSIBLE_TYPES
```

**`POSSIBLE_TYPES`** (from `new/utils.ts`):

```typescript
export const POSSIBLE_TYPES = ["component", "route", "markdown", "mdx"] as const;
```

Invalid `typeArg` → throws `"Invalid type: ${typeArg}"` → prints error + new help.

**Interactive type prompt** (`selectType()`):

```
message: 'What would you like to create?'
options:
  { value: 'component', label: 'Component' }
  { value: 'route',     label: 'Route' }
  { value: 'markdown',  label: 'Route (Markdown)' }
  { value: 'mdx',       label: 'Route (MDX)' }
```

**Interactive name prompt** (`selectName(typeArg)`):

| Type        | Message                     | Placeholder        |
| ----------- | --------------------------- | ------------------ |
| `route`     | `'New route path'`          | `'/product/[id]'`  |
| `markdown`  | `'New Markdown route path'` | `'/some/page.md'`  |
| `mdx`       | `'New MDX route path'`      | `'/some/page.mdx'` |
| `component` | `'Name your component'`     | `'my-component'`   |

Post-processing in `selectName`:

- For non-component types: if answer does not start with `/`, prepend `/`
- For `markdown`: strip `.md` suffix if present
- For `mdx`: strip `.mdx` suffix if present

#### Template Flag Inference

```
flagArgs    = app.args.filter(a => a.startsWith('--'))
templateArg = flagArgs.map(a => a.substring(2)).join('')
              // strips '--' prefix, joins all flag names (no values)

if templateArg is empty AND mainInput is non-empty:
  templateArg = 'qwik'     // default template when positional provided

if templateArg is empty AND mainInput is empty:
  templateArg = undefined → interactive prompt for template
```

**Interactive template prompt** (`selectTemplate(typeArg)`):

- Loads all templates, filters those that have entries for `typeArg`
- If only 1 template → selected automatically (no prompt)
- If multiple → `select` prompt: `'Which template would you like to use?'`

#### Output Directory Derivation

```
if typeArg in ['route', 'markdown', 'mdx']:
  outDir = join(app.rootDir, 'src', 'routes', nameArg)

if typeArg === 'component':
  outDir = join(app.rootDir, 'src', 'components', nameArg)
```

Note: `nameArg` for route types includes the leading `/` (e.g. `/foo/bar`), so the resulting path becomes `{rootDir}/src/routes//foo/bar` — the `join` normalizes the double slash.

#### Name/Slug Transformation

`parseInputName(input: string)` in `run-new-command.ts`:

```typescript
function parseInputName(input: string) {
  const parts = input.split(/[-_\s]/g); // split on hyphen, underscore, or whitespace
  return {
    slug: toSlug(parts), // parts.join('-')
    name: toPascal(parts), // parts.map(p => p[0].toUpperCase() + p.substring(1)).join('')
  };
}
```

**Examples:**

| Input           | `slug`          | `name`          |
| --------------- | --------------- | --------------- |
| `'my-button'`   | `'my-button'`   | `'MyButton'`    |
| `'my button'`   | `'my-button'`   | `'MyButton'`    |
| `'my_button'`   | `'my-button'`   | `'MyButton'`    |
| `'mybutton'`    | `'mybutton'`    | `'Mybutton'`    |
| `'nested/path'` | `'nested/path'` | `'Nested/path'` |

Note: `/` is NOT a split character — nested paths are preserved as-is in both slug and name (only the first char of the whole string is uppercased for `name`).

#### Duplicate File Guard

Before writing to the output file:

```
fileOutput = outFile with [slug] token replaced, .template extension stripped

if fs.existsSync(fileOutput):
  filename = fileOutput.split('/').pop()
  throw new Error(`"${filename}" already exists in "${outDir}"`)
  → log.error(message) + printNewHelp() + bye()
```

#### Template Directory Structure

Templates loaded from `{cliDistDir}/utils/templates/` (relative to compiled `utils/templates.ts` location).

Directory layout:

```
templates/
  {templateId}/             // e.g. 'qwik'
    component/              // component template files
    route/                  // route template files
    markdown/               // markdown route template files
    mdx/                    // mdx route template files
```

**Template file tokens** (replaced in both file path and file content):

- `[slug]` → replaced with computed `slug` value
- `[name]` → replaced with computed `name` value (content only; path uses `[slug]`)
- `.template` → stripped from output file path (not from content)

**Template sort order:** `'qwik'` template is always sorted first; remaining templates sorted alphabetically. When `templateArg = 'qwik'` (the default), the first matching template for the given type is selected.

**Template resolution:**

```
allTemplates = loadTemplates()    // reads all templateId/ directories
templates    = allTemplates.filter(t => t.id === templateArg && t[typeArg]?.length > 0)
if templates.length === 0 → log.error(`Template "${templateArg}" not found`) + bye()
template     = templates[0][typeArg][0]   // first file in the type's subdirectory
```

---

## Verified from Source

Derived from source files in the `build/v2` branch (HEAD `bfe19e8d9`). Date: 2026-04-01.

All behaviors documented above were verified by direct reading of the TypeScript source files listed in the [Source Files](#source-files) section. No CLI execution was performed.
