# Quick Task 7: Derive stub priority from directory - Summary

**Date:** 2026-04-02
**Commit:** 1c5fe93

## What was done

Made `priority` optional in stub `package.json` files by deriving it from the directory:
- `stubs/adapters/` defaults to priority 20
- `stubs/features/` defaults to priority -10
- `__qwik__.priority` still works as an override for custom ordering

Removed `priority` from 24 stub package.json files that used the default value. 12 stubs with non-default priorities (e.g., cloudflare-pages: 40, react: -20) kept their explicit values.

Updated README to reflect that `priority` is now optional.

## Files changed

- `src/integrations/load-integrations.ts` — added DEFAULT_PRIORITY map, set priority from directory when not specified
- 24 stub `package.json` files — removed default priority values
- `README.md` — updated examples and field reference table
