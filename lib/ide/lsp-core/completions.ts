// Adapted from DevChromium/wynntils-functions-tools (MIT License).

import { buildSnippet, formatSignature, FunctionsCatalog } from "@/lib/ide/lsp-core/catalog";
import { LspCompletionItem } from "@/lib/ide/types";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS = false;

export function createFunctionCompletionItems(catalog: FunctionsCatalog): LspCompletionItem[] {
    const completionItems: LspCompletionItem[] = [];

    for (const metadata of catalog.getAllFunctions()) {
        completionItems.push(createCompletionItem(catalog, metadata.canonicalName));

        for (const alias of metadata.aliases) {
            completionItems.push(createCompletionItem(catalog, alias));
        }
    }

    return completionItems;
}

function createCompletionItem(catalog: FunctionsCatalog, label: string): LspCompletionItem {
    const metadata = catalog.findByName(label);

    if (!metadata) {
        return {
            label,
            detail: label,
            insertText: `${label}()`,
        };
    }

    const signature = formatSignature(metadata, true, true);
    const snippet = buildSnippet(metadata, label, INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS);

    return {
        label,
        detail: `${metadata.canonicalName}${signature} -> ${metadata.returnType}`,
        insertText: snippet,
    };
}
