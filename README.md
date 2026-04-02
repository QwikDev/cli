# @qwik.dev/cli

The official CLI for Qwik projects. Provides `qwik` and `create-qwik` commands.

```bash
# Create a new project
pnpm create qwik

# Add an integration to an existing project
pnpm qwik add tailwind

# Create a new component/route
pnpm qwik new component my-button
```

## Requirements

- Node.js >= 24.0.0

## Development

```bash
pnpm install
pnpm build        # Build CLI
pnpm test         # Run all tests
pnpm test:unit    # Run unit tests only
pnpm lint         # Lint
pnpm format       # Format
```

## Project Structure

```
src/
  commands/       # CLI command implementations (add, new, build, migrate, etc.)
  integrations/   # Loading and applying stubs to user projects
  create-qwik/    # create-qwik scaffolding logic
  core.ts         # Program base class (all commands extend this)
  router.ts       # Command routing
stubs/
  adapters/       # Server deployment targets (cloudflare-pages, vercel-edge, etc.)
  features/       # Optional integrations (tailwind, vitest, drizzle, etc.)
  apps/           # Starter templates for create-qwik (base, empty, library, playground)
  templates/      # File generators for `qwik new` (component, route, markdown, mdx)
migrations/
  v2/             # v1 to v2 migration pipeline
```

## Contributing Stubs

Stubs are the most common contribution. They live in `stubs/adapters/` and `stubs/features/` and are **auto-discovered** — no registration needed. Drop a folder with a `package.json` and it shows up in `qwik add`.

### Adapter vs Feature

- **Adapter** (`stubs/adapters/`): A deployment target. Provides a server entry point and build config. Examples: cloudflare-pages, vercel-edge, node-server.
- **Feature** (`stubs/features/`): An optional integration. Adds tooling, styling, testing, etc. Examples: tailwind, vitest, drizzle.

### Stub Structure

Every stub is a directory with a `package.json` containing a `__qwik__` key. All other files get copied into the user's project when they run `qwik add <id>`.

```
stubs/features/my-feature/
  package.json          # Required: metadata + dependencies
  src/global.css        # Optional: files copied to user's project
  prettier.config.js    # Optional: any config files
```

The directory name becomes the stub ID (what users type in `qwik add <id>`).

### package.json format

```jsonc
{
  "description": "Human-readable description",
  "type": "module",
  // Dependencies merged into user's package.json
  "devDependencies": {
    "tailwindcss": "^4.1.4"
  },
  "__qwik__": {
    "displayName": "Integration: Tailwind v4 (styling)",
    "priority": -10,
    // Optional: auto-modify user's vite.config.ts
    "viteConfig": {
      "imports": [
        {
          "defaultImport": "tailwindcss",
          "importPath": "@tailwindcss/vite"
        }
      ],
      "vitePlugins": ["tailwindcss()"]
    },
    // Optional: doc links shown after install
    "docs": [
      "https://tailwindcss.com/docs"
    ],
    // Optional: next steps shown after install
    "nextSteps": {
      "title": "Next Steps",
      "lines": [
        "Add Tailwind directives to your global.css"
      ]
    }
  }
}
```

### `__qwik__` fields

| Field | Required | Description |
|-------|----------|-------------|
| `displayName` | Yes | Shown in the `qwik add` selection menu |
| `priority` | Yes | Sort order. Adapters use 1-40, features use -10 |
| `viteConfig` | No | Auto-adds imports and plugins to `vite.config.ts` |
| `docs` | No | Documentation URLs shown after install |
| `nextSteps` | No | Instructions shown after install |

### Adapter-specific files

Adapters typically include:

```
stubs/adapters/my-adapter/
  package.json
  adapters/my-adapter/vite.config.ts    # Build config
  src/entry.my-adapter.tsx              # Server entry point
  gitignore                             # Merged into .gitignore (no dot prefix)
```

The `scripts` in an adapter's `package.json` get merged into the user's `package.json`:

```json
{
  "scripts": {
    "build.server": "vite build -c adapters/my-adapter/vite.config.ts",
    "deploy": "my-platform deploy ./dist",
    "serve": "my-platform dev ./dist"
  }
}
```

### Testing your stub

Build the CLI and test against a real project:

```bash
pnpm build
node ./dist/bin/qwik.mjs add my-feature
```

Or run the existing integration tests:

```bash
pnpm test
```

## License

MIT
