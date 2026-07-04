import { FunctionCatalogResponse, FunctionEntry } from "@/lib/types";
import { normalizeFunctionAliases, normalizeFunctionLookupName } from "@/lib/function-names";
import { formatArgumentLabel } from "@/lib/ide/browser-lsp/function-arguments";

export type FunctionArgumentMetadata = {
    name: string;
    description?: string | null;
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
    private readonly functions: readonly FunctionMetadata[];
    private readonly metadataByName: Map<string, FunctionMetadata>;

    constructor(functions: readonly FunctionMetadata[]) {
        this.functions = functions;
        this.metadataByName = new Map();

        for (const metadata of this.functions) {
            this.metadataByName.set(normalizeFunctionLookupName(metadata.canonicalName), metadata);

            for (const alias of metadata.aliases) {
                this.metadataByName.set(normalizeFunctionLookupName(alias), metadata);
            }
        }
    }

    getAllFunctions() {
        return this.functions;
    }

    findByName(functionName: string) {
        return this.metadataByName.get(normalizeFunctionLookupName(functionName));
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
        includeTypes ? formatArgumentLabel(argument) : argument.name,
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
        aliases: normalizeFunctionAliases(entry.aliases, { splitCommaSeparated: true }),
        arguments: entry.arguments.map((argument) => ({
            name: argument.name || "arg",
            description: argument.description,
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
