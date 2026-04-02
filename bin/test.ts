import { assert } from "@japa/assert";
import { configure, processCLIArgs, run } from "@japa/runner";

processCLIArgs(process.argv.splice(2));

configure({
  plugins: [assert()],
  // Exclude Vitest-based unit tests — those use Vitest API (describe/expect), not Japa.
  // Run them separately with: pnpm run test:unit
  files: ["tests/**/*.spec.ts", "!tests/unit/upgrade/**", "!tests/unit/create-qwik/**"],
});

run();
