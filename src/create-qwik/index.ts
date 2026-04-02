import { panic, printHeader } from "../console.js";

/**
 * Entry dispatcher for create-qwik binary.
 *
 * If args are provided: dispatch to non-interactive path.
 * If no args: dispatch to interactive path (Plan 02 placeholder for now).
 */
export async function runCreateQwikCli(): Promise<void> {
  try {
    printHeader();
    const args = process.argv.slice(2);

    if (args.length > 0) {
      const { runCreateCli } = await import("./run-non-interactive.js");
      await runCreateCli(args);
    } else {
      const { runCreateInteractiveCli } = await import("./run-interactive.js");
      await runCreateInteractiveCli();
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    panic(msg);
  }
}
