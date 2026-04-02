import { bye } from "../../console.js";
import { Program } from "../../core.js";
import { runUpgrade } from "../../upgrade/orchestrator.js";

type MigrateArgs = { _: string[] };
type MigrateInput = { confirmed: boolean };

export class MigrateProgram extends Program<MigrateArgs, MigrateInput> {
  protected configure(): void {
    this.registerCommand("migrate-v2", "Migrate to Qwik v2");
  }

  protected validate(_definition: MigrateArgs): MigrateInput {
    // Validation does not auto-confirm; the confirmation prompt is in execute()
    // so it runs regardless of TTY mode and can be driven by stdin piping in tests.
    return { confirmed: false };
  }

  protected async interact(_definition: MigrateArgs): Promise<MigrateInput> {
    // interact() is called in TTY mode — same as execute() path but for interactive sessions
    return { confirmed: false };
  }

  protected async execute(_input: MigrateInput): Promise<number> {
    // Always ask for confirmation — @clack/prompts handles both TTY and piped stdin.
    // In tests: pipe "y\n" to confirm, pipe "\x03" (Ctrl+C) to cancel.
    // On cancel, scanBoolean internally calls bye() which exits 0 (UPGR-09).
    const confirmed = await this.scanBoolean("Do you want to proceed with the migration?", true);
    if (!confirmed) {
      bye(); // exits 0 — cancel is not an error (UPGR-09)
    }
    const rootDir = process.cwd();
    await runUpgrade(rootDir);
    return 0;
  }
}

export default MigrateProgram;
