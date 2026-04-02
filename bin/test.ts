import { assert } from "@japa/assert";
import { configure, processCLIArgs, run } from "@japa/runner";

processCLIArgs(process.argv.splice(2));

configure({
  plugins: [assert()],
  // Exclude tests/unit/upgrade/ — those use Vitest API (describe/expect), not Japa.
  // Run them separately with: pnpm vitest run tests/unit/upgrade/
  files: ["tests/**/*.spec.ts", "!tests/unit/upgrade/**", "!tests/unit/create-qwik/**"],
});

run();
