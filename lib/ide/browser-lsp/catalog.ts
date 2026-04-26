import { FunctionCatalogResponse, FunctionEntry } from "@/lib/types";

export type FunctionArgumentMetadata = {
    name: string;
    required: boolean;
    type: string;
    defaultValue?: string | null;
};

export type FunctionMetadata = {
    canonicalName: string;
    description: string;
    returnType: string;
    arguments: FunctionArgumentMetadata[];
    aliases: string[];
};

export class FunctionsCatalog {
    private readonly functions: FunctionMetadata[];
    private readonly metadataByName: Map<string, FunctionMetadata>;

    constructor(functions: FunctionMetadata[]) {
        this.functions = functions;
        this.metadataByName = new Map();

        for (const metadata of this.functions) {
            this.metadataByName.set(normalizeLookupName(metadata.canonicalName), metadata);

            for (const alias of metadata.aliases) {
                this.metadataByName.set(normalizeLookupName(alias), metadata);
            }
        }
    }

    getAllFunctions() {
        return this.functions;
    }

    findByName(functionName: string) {
        return this.metadataByName.get(normalizeLookupName(functionName));
    }
}

export function createCatalogFromResponse(response: FunctionCatalogResponse) {
    return new FunctionsCatalog(response.functions.map(normalizeFunctionEntry));
}

export function formatSignature(metadata: FunctionMetadata, includeOptionalArguments: boolean, includeTypes = false) {
    const argumentSource = includeOptionalArguments
        ? metadata.arguments
        : metadata.arguments.filter((argument) => argument.required);
    const argumentNames = argumentSource.map((argument) =>
        includeTypes ? `${argument.name}: ${argument.type}` : argument.name,
    );

    if (argumentNames.length === 0) {
        return "(no args)";
    }

    return `(${argumentNames.join("; ")})`;
}

export function buildSnippet(metadata: FunctionMetadata, functionName: string, includeOptionalArguments: boolean) {
    const argumentSource = includeOptionalArguments
        ? metadata.arguments
        : metadata.arguments.filter((argument) => argument.required);
    const snippetPlaceholders = argumentSource.map((argument, index) => `\${${index + 1}:${argument.name}}`);
    const snippetBody = snippetPlaceholders.join(argumentSource.length > 0 ? "; " : "");

    return `${functionName}(${snippetBody})$0`;
}

function normalizeFunctionEntry(entry: FunctionEntry): FunctionMetadata {
    return {
        canonicalName: entry.name,
        description: entry.description ?? "",
        returnType: normalizeType(entry.returnType),
        aliases: normalizeAliases(entry.aliases),
        arguments: entry.arguments.map((argument) => ({
            name: argument.name || "arg",
            required: argument.required,
            type: normalizeType(argument.type),
            defaultValue: argument.defaultValue,
        })),
    };
}

function normalizeType(typeValue: string | null | undefined) {
    if (!typeValue || typeof typeValue !== "string") {
        return "Any";
    }

    const trimmed = typeValue.trim();

    return trimmed.length > 0 ? trimmed : "Any";
}

function normalizeAliases(aliases: string[] | undefined) {
    if (!Array.isArray(aliases)) {
        return [];
    }

    return aliases
        .flatMap((alias) => alias.split(","))
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0);
}

function normalizeLookupName(name: string) {
    return name.toLowerCase();
}
