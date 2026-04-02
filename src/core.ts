import type { Option as ClackOption } from "@clack/prompts";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { scanBoolean, scanChoice, scanString } from "./console.ts";

type Option = {
  type?: "string" | "boolean" | "number";
  default?: unknown;
  description?: string;
  alias?: string;
  demandOption?: boolean;
};

/**
 * Program<T, U> abstract base class.
 * T = parsed args shape (from yargs)
 * U = interaction/validation result shape (passed to execute)
 *
 * Lifecycle: configure -> parse -> (isIt ? interact : validate) -> execute
 */
export abstract class Program<T, U> {
  #interactive: boolean | undefined;
  #commandName = "";
  #commandDescription = "";
  #options: Record<string, Option> = {};
  #aliases: Record<string, string> = {};

  /**
   * Register the command name and description for yargs.
   * Called from configure() in subclasses.
   */
  protected registerCommand(name: string, description: string): void {
    this.#commandName = name;
    this.#commandDescription = description;
  }

  /**
   * Register an option for yargs.
   * Called from configure() in subclasses.
   */
  protected registerOption(name: string, config: Option): void {
    this.#options[name] = config;
  }

  /**
   * Register an alias for a flag.
   * Called from configure() in subclasses.
   */
  protected registerAlias(name: string, alias: string): void {
    this.#aliases[name] = alias;
  }

  /**
   * Called by run() before parse(). Subclasses override to register commands/options.
   */
  protected abstract configure(): void;

  /**
   * Parse argv using yargs. Can be overridden by subclasses.
   */
  protected async parse(argv: string[]): Promise<T> {
    // argv is process.argv: ['node', 'qwik', '<command>', ...flags]
    // hideBin removes the first two entries
    let instance = yargs(hideBin(argv));

    if (this.#commandName) {
      instance = instance.command(this.#commandName, this.#commandDescription) as typeof instance;
    }

    for (const [name, config] of Object.entries(this.#options)) {
      instance = instance.option(name, config) as typeof instance;
    }

    for (const [name, alias] of Object.entries(this.#aliases)) {
      instance = instance.alias(name, alias) as typeof instance;
    }

    const parsed = await instance.parseAsync();
    return parsed as unknown as T;
  }

  /**
   * Validate parsed definition and return interaction result.
   * Used in non-interactive mode.
   */
  protected abstract validate(definition: T): U;

  /**
   * Interactive prompting. Default delegates to validate().
   * Override in subclasses to add prompts.
   */
  protected async interact(definition: T): Promise<U> {
    return this.validate(definition);
  }

  /**
   * Execute with fully resolved input. Returns exit code.
   */
  protected abstract execute(input: U): Promise<number>;

  /**
   * Detect whether the CLI is running in interactive mode.
   * Returns false in CI environments or non-TTY stdin.
   * Returns #interactive override if set.
   */
  protected isIt(): boolean {
    if (this.#interactive !== undefined) {
      return this.#interactive;
    }
    // CI environment detection
    if (
      process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.TF_BUILD
    ) {
      return false;
    }
    // Non-TTY stdin
    if (!process.stdin.isTTY) {
      return false;
    }
    return true;
  }

  /**
   * Override interactive detection for testing.
   */
  setInteractive(value: boolean): this {
    this.#interactive = value;
    return this;
  }

  /**
   * Orchestrate the full lifecycle:
   * configure -> parse -> (isIt ? interact : validate) -> execute
   */
  async run(argv: string[]): Promise<number> {
    this.configure();
    const definition = await this.parse(argv);
    let input: U;
    if (this.isIt()) {
      input = await this.interact(definition);
    } else {
      input = this.validate(definition);
    }
    return this.execute(input);
  }

  // Convenience prompt helpers delegating to console.ts
  protected scanBoolean(message: string, initial?: boolean): Promise<boolean> {
    return scanBoolean(message, initial);
  }

  protected scanString(message: string, placeholder?: string): Promise<string> {
    return scanString(message, placeholder);
  }

  protected scanChoice<V>(message: string, options: ClackOption<V>[]): Promise<V> {
    return scanChoice(message, options);
  }
}
