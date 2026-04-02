import { outro } from "../console.js";

/**
 * Placeholder for interactive CLI mode.
 * Plan 02 will replace this with the full interactive flow.
 */
export async function runCreateInteractiveCli(): Promise<void> {
  outro("Interactive mode requires arguments. Usage: create-qwik <starter> <outDir>");
  process.exit(1);
}
