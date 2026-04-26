import { buildSnippet, formatSignature, FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { LspCompletionItem } from "@/lib/ide/types";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS = false;
const COMPLETION_ITEM_KIND_FUNCTION = 3;
const INSERT_TEXT_FORMAT_SNIPPET = 2;

export function createFunctionCompletionItems(catalog: FunctionsCatalog): LspCompletionItem[] {
    const completionItems: LspCompletionItem[] = [];

    for (const metadata of catalog.getAllFunctions()) {
        completionItems.push(createCompletionItem(metadata, metadata.canonicalName));

        for (const alias of metadata.aliases) {
            completionItems.push(createCompletionItem(metadata, alias));
        }
    }

    return completionItems;
}

function createCompletionItem(metadata: FunctionMetadata, label: string): LspCompletionItem {
    const signature = formatSignature(metadata, true, true);
    const snippet = buildSnippet(metadata, label, INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS);

    return {
        label,
        kind: COMPLETION_ITEM_KIND_FUNCTION,
        detail: `${metadata.canonicalName}${signature} -> ${metadata.returnType}`,
        insertTextFormat: INSERT_TEXT_FORMAT_SNIPPET,
        insertText: snippet,
    };
}
