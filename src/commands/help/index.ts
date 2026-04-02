import { Program } from "../../core.js";

type HelpArgs = { _: string[] };
type HelpInput = Record<string, never>;

/** List of all CLI commands with descriptions (ARCH-08) */
export const COMMAND_LIST: { name: string; description: string }[] = [
  { name: "add", description: "Add an integration to this app" },
  { name: "build", description: "Build the application" },
  { name: "new", description: "Create a new component or route" },
  { name: "joke", description: "Tell a random dad joke" },
  { name: "migrate-v2", description: "Migrate to Qwik v2" },
  { name: "check-client", description: "Check client build freshness" },
  { name: "help", description: "Show help for all commands" },
  { name: "version", description: "Print CLI version" },
];

export class HelpProgram extends Program<HelpArgs, HelpInput> {
  protected configure(): void {
    this.registerCommand("help", "Show help for all commands");
  }

  /** Override parse to return empty args without invoking yargs (avoids yargs --help interception) */
  protected async parse(_argv: string[]): Promise<HelpArgs> {
    return { _: [] };
  }

  protected validate(_definition: HelpArgs): HelpInput {
    return {};
  }

  protected async execute(_input: HelpInput): Promise<number> {
    console.log("Available commands:\n");
    for (const cmd of COMMAND_LIST) {
      console.log(`  ${cmd.name.padEnd(16)} ${cmd.description}`);
    }
    console.log("");
    return 0;
  }
}

export default HelpProgram;
