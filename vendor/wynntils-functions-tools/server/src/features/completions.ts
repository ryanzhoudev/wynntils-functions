import { CompletionItem, CompletionItemKind, InsertTextFormat } from "vscode-languageserver/node";
import { buildSnippet, formatSignature, FunctionMetadata, functionsCatalog } from "../metadata/functionsCatalog";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS = false;

export function createFunctionCompletionItems(): CompletionItem[] {
  const completionItems: CompletionItem[] = [];

  for (const metadata of functionsCatalog.getAllFunctions()) {
    completionItems.push(createCompletionItem(metadata, metadata.canonicalName));

    for (const alias of metadata.aliases) {
      completionItems.push(createCompletionItem(metadata, alias));
    }
  }

  return completionItems;
}

function createCompletionItem(metadata: FunctionMetadata, label: string): CompletionItem {
  const signature = formatSignature(metadata, true, true);
  const snippet = buildSnippet(metadata, label, INCLUDE_OPTIONAL_ARGUMENTS_IN_SNIPPETS);

  return {
    label,
    kind: CompletionItemKind.Function,
    detail: `${metadata.canonicalName}${signature} -> ${metadata.returnType}`,
    insertTextFormat: InsertTextFormat.Snippet,
    insertText: snippet
  };
}
