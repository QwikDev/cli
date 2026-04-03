import kleur from "kleur";
import { printHeader } from "./console.ts";
import type { Program } from "./core.ts";

// COMMANDS map with dynamic imports for fast startup (ARCH-02)
const COMMANDS: Record<string, () => Promise<{ default: new () => Program<unknown, unknown> }>> = {
  add: () => import("./commands/add/index.ts"),
  build: () => import("./commands/build/index.ts"),
  new: () => import("./commands/new/index.ts"),
  joke: () => import("./commands/joke/index.ts"),
  "migrate-v2": () => import("./commands/migrate/index.ts"),
  upgrade: () => import("./commands/migrate/index.ts"),
  "check-client": () => import("./commands/check-client/index.ts"),
  help: () => import("./commands/help/index.ts"),
  version: () => import("./commands/version/index.ts"),
};

// Commands that must produce no extraneous output (used in CI/git hooks)
const SILENT_COMMANDS = new Set(["check-client"]);

export async function runCli(): Promise<void> {
  const task = process.argv[2];

  if (!task || !SILENT_COMMANDS.has(task)) {
    printHeader();
  }

  if (!task || !COMMANDS[task]) {
    if (task) {
      // ARCH-08: red error for unrecognized command
      console.error(kleur.red(`Unrecognized qwik command: ${task}\n`));
    }
    // Both "no command" and "unrecognized" print help then exit 1
    const { default: HelpProgram } = await COMMANDS.help!();
    const help = new HelpProgram();
    help.setInteractive(false);
    await help.run(process.argv);
    process.exit(1);
  }

  const { default: Cmd } = await COMMANDS[task]!();
  const program = new Cmd();
  const code = await program.run(process.argv);
  process.exit(code ?? 0);
}

// Export command names for help command to use
export const COMMAND_NAMES = Object.keys(COMMANDS);
