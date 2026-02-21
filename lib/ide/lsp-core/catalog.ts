import { FunctionMetadata } from "@/lib/ide/types";

type AliasMap = Map<string, FunctionMetadata>;

export class FunctionsCatalog {
    private metadataByName: AliasMap = new Map();
    private functions: FunctionMetadata[] = [];

    setFunctions(functions: FunctionMetadata[]) {
        this.functions = functions;
        this.metadataByName = new Map();

        for (const metadata of this.functions) {
            this.metadataByName.set(metadata.canonicalName, metadata);

            for (const alias of metadata.aliases) {
                this.metadataByName.set(alias, metadata);
            }
        }
    }

    getAllFunctions() {
        return this.functions;
    }

    findByName(functionName: string) {
        return this.metadataByName.get(functionName);
    }
}

export function formatSignature(metadata: FunctionMetadata, includeOptionalArguments: boolean, includeTypes = false) {
    const argumentSource = includeOptionalArguments
        ? metadata.arguments
        : metadata.arguments.filter((argument) => argument.required);

    const argumentNames = argumentSource.map((argument) =>
        includeTypes ? `${argument.name}: ${argument.type}` : argument.name,
    );

    if (argumentNames.length === 0) {
        return "()";
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
