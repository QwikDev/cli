import { join } from "node:path";
import { bye, panic } from "../../console.js";
import { Program } from "../../core.js";
import {
  loadIntegrations,
  sortIntegrationsAndReturnAsClackOptions,
} from "../../integrations/load-integrations.js";
import {
  commitIntegration,
  installDeps,
  integrationHasDeps,
  runPostInstall,
} from "../../integrations/update-app.js";

type AddArgs = {
  _: string[];
  skipConfirmation?: string;
  projectDir?: string;
};

type AddInput = {
  id?: string;
  skipConfirmation: boolean;
  projectDir?: string;
};

export class AddProgram extends Program<AddArgs, AddInput> {
  protected configure(): void {
    this.registerCommand("add", "Add an integration to this app");
    this.registerOption("skipConfirmation", { type: "string" });
    this.registerOption("projectDir", { type: "string" });
  }

  protected validate(definition: AddArgs): AddInput {
    const id = definition._[1] as string | undefined;
    const skipConfirmation = definition.skipConfirmation === "true";
    const projectDir = definition.projectDir;
    return {
      ...(id !== undefined && { id }),
      skipConfirmation,
      ...(projectDir !== undefined && { projectDir }),
    };
  }

  protected async interact(definition: AddArgs): Promise<AddInput> {
    const input = this.validate(definition);

    if (input.id === undefined && this.isIt()) {
      const integrations = await loadIntegrations();
      const options = sortIntegrationsAndReturnAsClackOptions(integrations);
      const selected = await this.scanChoice("Select an integration", options);
      input.id = selected.id;
    }

    return input;
  }

  protected async execute(input: AddInput): Promise<number> {
    const integrations = await loadIntegrations();

    let integration = integrations.find((i) => i.id === input.id);

    if (input.id !== undefined) {
      if (!integration) {
        panic(`Invalid integration: ${input.id}`);
      }
    } else {
      // Non-interactive, no positional arg
      if (!this.isIt()) {
        if (integrations.length === 1) {
          // Auto-select the only available integration (ADD-02)
          integration = integrations[0];
        } else {
          panic("No integration specified");
        }
      }
    }

    // TypeScript narrowing: integration must be defined by now
    if (!integration) {
      panic("No integration selected");
    }

    // Determine rootDir
    const rootDir = input.projectDir
      ? join(process.cwd(), input.projectDir)
      : process.cwd();

    // ADD-05: Consent gate
    if (!input.skipConfirmation) {
      const proceed = await this.scanBoolean(
        `Ready to apply ${integration.id}?`,
        true,
      );
      if (!proceed) {
        bye();
      }
    }

    // Commit files to disk
    await commitIntegration(integration, rootDir);

    // ADD-06: Install deps if needed
    if (integrationHasDeps(integration)) {
      await installDeps(rootDir);
    }

    // ADD-07: Run postInstall if defined
    const qwikMeta = integration.pkgJson.__qwik__ as
      | Record<string, unknown>
      | undefined;
    const postInstall = qwikMeta?.postInstall as string | undefined;
    if (postInstall) {
      await runPostInstall(postInstall, rootDir);
    }

    return 0;
  }
}

export default AddProgram;
