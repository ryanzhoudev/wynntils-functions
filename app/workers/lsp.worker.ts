// workers.worker.ts
import {
    BrowserMessageReader,
    BrowserMessageWriter,
    CompletionItemKind,
    TextDocumentSyncKind,
    TextDocuments,
    createConnection
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { CompletionItem, Diagnostic } from "vscode-languageserver/browser";

console.log("wynntils LSP worker starting up");
const reader = new BrowserMessageReader(self);
const writer = new BrowserMessageWriter(self);
const connection = createConnection(reader, writer);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => ({
    capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: { resolveProvider: false },
        hoverProvider: true
    }
}));

documents.onDidChangeContent((change) => {
    const diagnostics: Diagnostic[] = [];
    // … your parse + error-check logic …
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

connection.onCompletion((): CompletionItem[] => [
    { label: "print", kind: CompletionItemKind.Function },
    { label: "if", kind: CompletionItemKind.Keyword }
    // …
]);

documents.listen(connection);
connection.listen();
