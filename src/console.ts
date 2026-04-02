import {
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import kleur from "kleur";

// Re-exports from @clack/prompts for direct use
export { intro, isCancel, note, outro, spinner };

/**
 * Exit helpers (ARCH-07)
 */

/** Calls outro with farewell message then exits with code 0. Used on user cancel. */
export function bye(): never {
  outro("Take care, see you soon!");
  process.exit(0);
}

/** Prints red error to stderr then exits with code 1. Used on fatal errors. */
export function panic(msg: string): never {
  console.error(kleur.red(`Error: ${msg}`));
  process.exit(1);
}

/**
 * Header (ARCH-05)
 * Prints the ASCII art logo with kleur.blue() for geometry and kleur.magenta() for inner dots.
 */
export function printHeader(): void {
  // biome-ignore format: intentional ASCII art alignment
  const lines = [
    kleur.magenta("      ............"),
    `    ${kleur.blue("::::")} ${kleur.blue(":--------:")}.`,
    `   ${kleur.blue("::::")}  ${kleur.blue(".:-------:")}.`,
    `  ${kleur.blue(":::::")}   ${kleur.blue(".:------")}.`,
    `  ${kleur.blue("::::::")}     ${kleur.blue(".:-----")}.`,
    ` ${kleur.blue("::::::")}        ${kleur.blue(":-----:")}`,
    ` ${kleur.blue("::::::")}       ${kleur.blue(".:----")}.`,
    `  ${kleur.blue(":::::::")}     ${kleur.blue(".----")}.`,
    `   ${kleur.blue("::::::::")}..   ${kleur.blue("---:")}`,
    `    ${kleur.blue(".:::::::::.")} ${kleur.blue(":-:")}`,
    `     ${kleur.blue("..::::::::::::")}`,
    `             ${kleur.blue("...::::")}`,
  ];
  console.log(`${lines.join("\n")}\n`);
}

/**
 * Prompt wrappers (ARCH-03)
 */

/** Wraps @clack/prompts confirm. Calls bye() if user cancels. */
export async function scanBoolean(
  message: string,
  initial?: boolean,
): Promise<boolean> {
  const result = await confirm({ message, initialValue: initial });
  if (isCancel(result)) {
    bye();
  }
  return result as boolean;
}

/** Wraps @clack/prompts text. Calls bye() if user cancels. */
export async function scanString(
  message: string,
  placeholder?: string,
): Promise<string> {
  const result = await text({ message, placeholder });
  if (isCancel(result)) {
    bye();
  }
  return result as string;
}

/** Wraps @clack/prompts select. Calls bye() if user cancels. */
export async function scanChoice<T>(
  message: string,
  options: { value: T; label: string; hint?: string }[],
): Promise<T> {
  const result = await select({ message, options });
  if (isCancel(result)) {
    bye();
  }
  return result as T;
}
