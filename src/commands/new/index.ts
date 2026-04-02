import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Program } from "../../core.js";
import { inferTemplate, inferTypeAndName, parseInputName } from "./parse-input.js";
import {
  NAME_TOKEN,
  getOutDir,
  loadTemplates,
  type TemplateType,
  writeTemplateFile,
} from "./templates.js";

type NewArgs = { _: string[] };
type NewInput = {
  typeArg: TemplateType;
  nameArg: string;
  templateId: string;
  rootDir: string;
};

export class NewProgram extends Program<NewArgs, NewInput> {
  protected configure(): void {
    this.registerCommand("new", "Create a new component or route");
  }

  protected validate(_definition: NewArgs): NewInput {
    const { typeArg, nameArg } = inferTypeAndName(process.argv);

    if (typeArg === undefined || nameArg === undefined) {
      throw new Error("Type and name are required in non-interactive mode. Usage: qwik new <name>");
    }

    const templateId = inferTemplate(process.argv, !!nameArg) ?? "qwik";
    const rootDir = process.cwd();

    return { typeArg: typeArg as TemplateType, nameArg, templateId, rootDir };
  }

  protected async interact(_definition: NewArgs): Promise<NewInput> {
    let { typeArg, nameArg } = inferTypeAndName(process.argv);

    if (typeArg === undefined) {
      typeArg = await this.scanChoice<string>("What type?", [
        { value: "route", label: "Route" },
        { value: "component", label: "Component" },
        { value: "markdown", label: "Markdown" },
        { value: "mdx", label: "MDX" },
      ]);
    }

    if (nameArg === undefined) {
      const rawName = await this.scanString("Name:");
      // Re-infer type from the name if it starts with "/"
      if (rawName.startsWith("/")) {
        if (rawName.endsWith(".md")) {
          typeArg = "markdown";
          nameArg = rawName.slice(0, -".md".length);
        } else if (rawName.endsWith(".mdx")) {
          typeArg = "mdx";
          nameArg = rawName.slice(0, -".mdx".length);
        } else {
          typeArg = "route";
          nameArg = rawName;
        }
      } else {
        nameArg = rawName;
      }
    }

    let templateId = inferTemplate(process.argv, !!nameArg);

    if (templateId === undefined) {
      const templates = loadTemplates();
      const matching = templates.filter((t) => t[typeArg as TemplateType] !== undefined);

      if (matching.length === 1) {
        // NEW-06: auto-select when exactly 1 template exists for chosen type
        templateId = matching[0]!.id;
      } else if (matching.length > 1) {
        templateId = await this.scanChoice<string>(
          "Choose template:",
          matching.map((t) => ({ value: t.id, label: t.id })),
        );
      } else {
        templateId = "qwik";
      }
    }

    const rootDir = process.cwd();

    return {
      typeArg: typeArg as TemplateType,
      nameArg: nameArg!,
      templateId,
      rootDir,
    };
  }

  protected async execute(input: NewInput): Promise<number> {
    try {
      const templates = loadTemplates();
      const template = templates.find((t) => t.id === input.templateId);

      if (!template) {
        console.error(`Template "${input.templateId}" not found`);
        return 1;
      }

      const templateFiles = template[input.typeArg];

      if (!templateFiles || templateFiles.length === 0) {
        console.error(
          `No template files found for type "${input.typeArg}" in template "${input.templateId}"`,
        );
        return 1;
      }

      // Special handling for markdown and mdx: flat file, not subdirectory
      if (input.typeArg === "markdown" || input.typeArg === "mdx") {
        const ext = input.typeArg === "markdown" ? ".md" : ".mdx";
        // nameArg is already stripped of extension (e.g., "/blog/post")
        const dir = join(input.rootDir, "src", "routes", dirname(input.nameArg));
        const filename = basename(input.nameArg) + ext;
        mkdirSync(dir, { recursive: true });
        const fileOutput = join(dir, filename);

        if (existsSync(fileOutput)) {
          const msg = `"${filename}" already exists in "${dir}"`;
          console.error(msg);
          return 1;
        }

        const { name } = parseInputName(basename(input.nameArg));
        const content = templateFiles[0]!.content.replace(NAME_TOKEN, name);
        writeFileSync(fileOutput, content, "utf-8");

        console.log(`Created ${fileOutput}`);
        return 0;
      }

      // Normal route and component path
      const outDir = getOutDir(input.rootDir, input.typeArg, input.nameArg);

      // Determine the name segment for parseInputName
      let nameSegment: string;
      if (input.typeArg === "component") {
        // For components, use the full nameArg (e.g., "counter")
        nameSegment = input.nameArg;
      } else {
        // For routes, use the LAST path segment (e.g., "/dashboard" -> "dashboard")
        nameSegment = basename(input.nameArg);
      }

      const { slug, name } = parseInputName(nameSegment);

      for (const templateFile of templateFiles) {
        writeTemplateFile(outDir, templateFile, slug, name);
      }

      console.log(`Created files in ${outDir}`);
      return 0;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("already exists")) {
        console.error(message);
        return 1;
      }
      console.error(message);
      return 1;
    }
  }
}

export default NewProgram;
