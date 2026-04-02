import kleur from "kleur";
import { printHeader } from "./console.js";
import type { Program } from "./core.js";

// COMMANDS map with dynamic imports for fast startup (ARCH-02)
const COMMANDS: Record<
  string,
  () => Promise<{ default: new () => Program<unknown, unknown> }>
> = {
  add: () => import("./commands/add/index.js"),
  build: () => import("./commands/build/index.js"),
  new: () => import("./commands/new/index.js"),
  joke: () => import("./commands/joke/index.js"),
  "migrate-v2": () => import("./commands/migrate/index.js"),
  upgrade: () => import("./commands/migrate/index.js"),
  "check-client": () => import("./commands/check-client/index.js"),
  help: () => import("./commands/help/index.js"),
  version: () => import("./commands/version/index.js"),
};

export async function runCli(): Promise<void> {
  printHeader();
  const task = process.argv[2];

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
