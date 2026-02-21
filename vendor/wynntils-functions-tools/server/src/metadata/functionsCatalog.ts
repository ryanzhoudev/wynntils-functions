import rawFunctionMetadata from "../data/wynntilsFunctions.json";

export interface FunctionArgumentMetadata {
  name: string;
  required: boolean;
  type: string;
  defaultValue?: string | null;
}

export interface FunctionMetadata {
  canonicalName: string;
  description: string;
  returnType: string;
  arguments: FunctionArgumentMetadata[];
  aliases: string[];
}

type RawFunction = {
  name: string;
  description?: string;
  return?: string;
  aliases?: string[];
  args?: { name?: string; required?: boolean; type?: string; default?: string | null }[];
};

class FunctionsCatalog {
  private readonly functions: FunctionMetadata[];
  private readonly metadataByName: Map<string, FunctionMetadata>;

  constructor(functions: FunctionMetadata[]) {
    this.functions = functions;
    this.metadataByName = new Map();

    for (const metadata of this.functions) {
      this.metadataByName.set(metadata.canonicalName, metadata);

      for (const alias of metadata.aliases) {
        this.metadataByName.set(alias, metadata);
      }
    }
  }

  public getAllFunctions(): FunctionMetadata[] {
    return this.functions;
  }

  public findByName(functionName: string): FunctionMetadata | undefined {
    return this.metadataByName.get(functionName);
  }
}

const normalizedFunctions: FunctionMetadata[] = (rawFunctionMetadata as RawFunction[]).map(rawFunction => ({
  canonicalName: rawFunction.name,
  description: rawFunction.description ?? "",
  returnType: rawFunction.return ?? "any",
  aliases: normalizeAliases(rawFunction.aliases),
  arguments: (rawFunction.args ?? []).map(argument => ({
    name: argument.name ?? "arg",
    required: Boolean(argument.required),
    type: normalizeArgumentType(argument.type),
    defaultValue: argument.default ?? null
  }))
}));

export const functionsCatalog = new FunctionsCatalog(normalizedFunctions);

export function formatSignature(metadata: FunctionMetadata, includeOptionalArguments: boolean, includeTypes = false): string {
  const argumentSource = includeOptionalArguments ? metadata.arguments : metadata.arguments.filter(argument => argument.required);
  const argumentNames = argumentSource.map(argument => includeTypes ? `${argument.name}: ${argument.type}` : argument.name);

  if (argumentNames.length === 0) {
    return "(no args)";
  }

  return `(${argumentNames.join("; ")})`;
}

export function buildSnippet(metadata: FunctionMetadata, functionName: string, includeOptionalArguments: boolean): string {
  const argumentSource = includeOptionalArguments ? metadata.arguments : metadata.arguments.filter(argument => argument.required);
  const snippetPlaceholders = argumentSource.map((argument, index) => `\${${index + 1}:${argument.name}}`);
  const snippetBody = snippetPlaceholders.join(argumentSource.length > 0 ? "; " : "");
  return `${functionName}(${snippetBody})$0`;
}

function normalizeArgumentType(typeValue: string | undefined): string {
  if (!typeValue || typeof typeValue !== "string") {
    return "Any";
  }
  const trimmed = typeValue.trim();
  return trimmed.length > 0 ? trimmed : "Any";
}

function normalizeAliases(aliases: string[] | undefined): string[] {
  if (!Array.isArray(aliases)) {
    return [];
  }

  return aliases
    .flatMap(alias => alias.split(","))
    .map(alias => alias.trim())
    .filter(alias => alias.length > 0);
}
