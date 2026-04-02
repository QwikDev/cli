import { Program } from "../../core.js";

type MigrateArgs = { _: string[] };
type MigrateInput = Record<string, never>;

export class MigrateProgram extends Program<MigrateArgs, MigrateInput> {
  protected configure(): void {
    this.registerCommand("migrate-v2", "Migrate to Qwik v2");
  }

  protected validate(_definition: MigrateArgs): MigrateInput {
    return {};
  }

  protected async execute(_input: MigrateInput): Promise<number> {
    console.log("migrate-v2 command (stub)");
    return 0;
  }
}

export default MigrateProgram;
