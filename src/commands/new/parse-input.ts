import { createRegExp, oneOrMore, charIn, whitespace } from "magic-regexp";

const SEPARATOR = createRegExp(oneOrMore(charIn("-_").or(whitespace)));
const SEPARATOR_GLOBAL = createRegExp(oneOrMore(charIn("-_").or(whitespace)), ["g"]);

/**
 * Parse a raw name input into slug and PascalCase name.
 * Splits ONLY on [-_\s]. Forward slash (/) is NOT a separator.
 */
export function parseInputName(input: string): { slug: string; name: string } {
  // Split on hyphens, underscores, and whitespace only
  const parts = input.split(SEPARATOR).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { slug: input, name: input };
  }

  // Slug: join with hyphen. But we need to preserve "/" characters.
  // Since "/" is not a separator, the whole input with "/" intact,
  // just replacing [-_\s] with "-"
  const slug = input.replace(SEPARATOR_GLOBAL, "-");

  // PascalCase: capitalize only the split parts (not "/" segments)
  // We need to capitalize at [-_\s] boundaries, not at "/"
  const name = input
    .split(SEPARATOR)
    .map((part) => {
      if (part.length === 0) return "";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");

  return { slug, name };
}

/**
 * Infer typeArg and nameArg from process.argv-style args.
 * Takes full argv (e.g. ["node", "qwik", "new", "/dashboard"]).
 */
export function inferTypeAndName(args: string[]): {
  typeArg: string | undefined;
  nameArg: string | undefined;
} {
  // Slice off "node" and "qwik"
  const sliced = args.slice(2);
  // Filter out flags (starting with "--") and the command name "new"
  const nonFlags = sliced.filter((a) => !a.startsWith("--"));
  // First non-flag arg after "new" is the command, second is the input
  const commandIdx = nonFlags.indexOf("new");
  const mainInput = commandIdx >= 0 ? nonFlags[commandIdx + 1] : (nonFlags[0] ?? "");

  if (!mainInput) {
    return { typeArg: undefined, nameArg: undefined };
  }

  if (mainInput.startsWith("/")) {
    if (mainInput.endsWith(".md")) {
      return {
        typeArg: "markdown",
        nameArg: mainInput.slice(0, -".md".length),
      };
    }
    if (mainInput.endsWith(".mdx")) {
      return {
        typeArg: "mdx",
        nameArg: mainInput.slice(0, -".mdx".length),
      };
    }
    return { typeArg: "route", nameArg: mainInput };
  }

  return { typeArg: "component", nameArg: mainInput };
}

/**
 * Infer which template ID to use.
 * If a --templateId flag is passed, use it.
 * If hasPositional is true and no flag, default to 'qwik'.
 * Otherwise undefined (interactive).
 */
export function inferTemplate(argv: string[], hasPositional: boolean): string | undefined {
  const sliced = argv.slice(2);

  for (let i = 0; i < sliced.length; i++) {
    const arg = sliced[i];
    if (arg === "--templateId" && i + 1 < sliced.length) {
      return sliced[i + 1];
    }
    if (arg?.startsWith("--templateId=")) {
      return arg.slice("--templateId=".length);
    }
  }

  if (hasPositional) {
    return "qwik";
  }

  return undefined;
}
