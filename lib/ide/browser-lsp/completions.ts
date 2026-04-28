import { buildSnippet, formatSignature, FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { isTypeCompatible } from "@/lib/ide/browser-lsp/type-system";
import { LspCompletionItem } from "@/lib/ide/types";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS = false;
const COMPLETION_ITEM_KIND_FUNCTION = 3;
const INSERT_TEXT_FORMAT_SNIPPET = 2;

type CompletionOptions = {
    expectedType?: string;
};

export function createFunctionCompletionItems(catalog: FunctionsCatalog, options: CompletionOptions = {}): LspCompletionItem[] {
    const completionItems: LspCompletionItem[] = [];

    for (const metadata of catalog.getAllFunctions()) {
        completionItems.push(createCompletionItem(metadata, metadata.canonicalName, options.expectedType));

        for (const alias of metadata.aliases) {
            completionItems.push(createCompletionItem(metadata, alias, options.expectedType));
        }
    }

    return completionItems;
}

function createCompletionItem(metadata: FunctionMetadata, label: string, expectedType: string | undefined): LspCompletionItem {
    const signature = formatSignature(metadata, true, true);
    const snippet = buildSnippet(metadata, label, INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS);
    const isExpectedType = expectedType ? isTypeCompatible(expectedType, metadata.returnType) : false;
    const sortPrefix = expectedType ? (isExpectedType ? "0" : "1") : "0";

    return {
        label,
        kind: COMPLETION_ITEM_KIND_FUNCTION,
        detail: `${metadata.canonicalName}${signature} -> ${metadata.returnType}`,
        documentation: {
            kind: "markdown",
            value: createDocumentation(metadata, signature),
        },
        insertTextFormat: INSERT_TEXT_FORMAT_SNIPPET,
        insertText: snippet,
        sortText: `${sortPrefix}_${label}`,
    };
}

function createDocumentation(metadata: FunctionMetadata, signature: string) {
    const description = metadata.description ? `${metadata.description}\n\n` : "";
    const argumentsDocumentation =
        metadata.arguments.length > 0
            ? `**Arguments**\n${metadata.arguments.map((argument) => `- \`${argument.name}\` (${argument.type})${argument.description ? `: ${argument.description}` : ""}`).join("\n")}\n\n`
            : "";

    return `\`${metadata.canonicalName}${signature} -> ${metadata.returnType}\`\n\n${description}${argumentsDocumentation}Returns \`${metadata.returnType}\``;
}
