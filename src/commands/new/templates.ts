import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRegExp, exactly } from "magic-regexp";

export const SLUG_TOKEN = createRegExp(exactly("[slug]"), ["g"]);
export const NAME_TOKEN = createRegExp(exactly("[name]"), ["g"]);
const TEMPLATE_EXT = createRegExp(exactly(".template").and(exactly("").at.lineEnd()));

export type TemplateType = "component" | "route" | "markdown" | "mdx";

export interface TemplateFile {
  filename: string; // e.g. "index.tsx.template" or "[slug].tsx.template"
  content: string;
}

export interface Template {
  id: string; // e.g. "qwik"
  component?: TemplateFile[];
  route?: TemplateFile[];
  markdown?: TemplateFile[];
  mdx?: TemplateFile[];
}

/**
 * Resolve the stubs/ directory relative to this file.
 * Source: src/commands/new/ -> 3 levels up to project root
 * Compiled: dist/src/commands/new/ -> 4 levels up to project root
 *
 * We detect the context by checking if the 3-level path contains stubs/.
 */
function resolveStubsDir(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const threeUp = join(__dirname, "..", "..", "..", "stubs");
  if (existsSync(threeUp)) {
    return threeUp;
  }
  return join(__dirname, "..", "..", "..", "..", "stubs");
}

/**
 * Discover and load all templates from stubs/templates/.
 * Resolves the directory using import.meta.url for ESM compatibility.
 */
export function loadTemplates(): Template[] {
  const templatesDir = join(resolveStubsDir(), "templates");

  if (!existsSync(templatesDir)) {
    return [];
  }

  const templateIds = readdirSync(templatesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => {
      // Sort 'qwik' first
      if (a === "qwik") return -1;
      if (b === "qwik") return 1;
      return a.localeCompare(b);
    });

  const templates: Template[] = [];

  for (const id of templateIds) {
    const templateDir = join(templatesDir, id);
    const template: Template = { id };

    for (const type of ["component", "route", "markdown", "mdx"] as const) {
      const typeDir = join(templateDir, type);

      if (!existsSync(typeDir)) {
        continue;
      }

      const files = readdirSync(typeDir, { withFileTypes: true })
        .filter((f) => f.isFile() && f.name !== ".gitkeep")
        .map((f) => ({
          filename: f.name,
          content: readFileSync(join(typeDir, f.name), "utf-8"),
        }));

      if (files.length > 0) {
        template[type] = files;
      }
    }

    templates.push(template);
  }

  return templates;
}

/**
 * Write a single template file to disk, substituting [slug] and [name] tokens.
 * Throws if the output file already exists (NEW-04 duplicate guard).
 */
export function writeTemplateFile(
  outDir: string,
  templateFile: TemplateFile,
  slug: string,
  name: string,
): void {
  mkdirSync(outDir, { recursive: true });

  // Compute output filename: replace [slug] with slug, strip .template extension
  const outFilename = templateFile.filename.replace(SLUG_TOKEN, slug).replace(TEMPLATE_EXT, "");

  const fileOutput = join(outDir, outFilename);

  // NEW-04: Duplicate guard
  if (existsSync(fileOutput)) {
    throw new Error(`"${outFilename}" already exists in "${outDir}"`);
  }

  // Replace [slug] and [name] tokens in content
  const content = templateFile.content.replace(SLUG_TOKEN, slug).replace(NAME_TOKEN, name);

  writeFileSync(fileOutput, content, "utf-8");
}

/**
 * Get the output directory for a given type and nameArg.
 * - component: flat path (src/components), no nameArg subdirectory
 * - route/markdown/mdx: src/routes/<nameArg>
 *
 * Throws if the resolved path escapes the expected base directory (path traversal guard).
 */
export function getOutDir(rootDir: string, typeArg: TemplateType, nameArg: string): string {
  if (typeArg === "component") {
    // NEW-02: flat, no subdirectory
    return join(rootDir, "src", "components");
  }

  // route, markdown, mdx: nameArg includes leading "/" which path.join normalizes
  const outDir = join(rootDir, "src", "routes", nameArg);

  // Path traversal guard: resolved path must remain under src/routes/
  const expectedBase = resolve(rootDir, "src", "routes");
  const resolvedOut = resolve(outDir);
  if (!resolvedOut.startsWith(expectedBase + "/") && resolvedOut !== expectedBase) {
    throw new Error(
      `Invalid name: "${nameArg}" would escape the routes directory. Path traversal is not allowed.`,
    );
  }

  return outDir;
}
