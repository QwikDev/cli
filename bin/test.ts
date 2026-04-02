import { assert } from "@japa/assert";
import { configure, processCLIArgs, run } from "@japa/runner";

processCLIArgs(process.argv.splice(2));

configure({
  plugins: [assert()],
  files: ["tests/**/*.spec.ts"],
});

run();
