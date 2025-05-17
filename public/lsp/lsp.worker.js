"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// workers.worker.ts
var browser_1 = require("vscode-languageserver/browser");
var vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
console.log("wynntils LSP worker starting up");
var reader = new browser_1.BrowserMessageReader(self);
var writer = new browser_1.BrowserMessageWriter(self);
var connection = (0, browser_1.createConnection)(reader, writer);
var documents = new browser_1.TextDocuments(
    vscode_languageserver_textdocument_1.TextDocument
);
connection.onInitialize(function () {
    return {
        capabilities: {
            textDocumentSync: browser_1.TextDocumentSyncKind.Incremental,
            completionProvider: { resolveProvider: false },
            hoverProvider: true
        }
    };
});
documents.onDidChangeContent(function (change) {
    var diagnostics = [];
    // … your parse + error-check logic …
    connection.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: diagnostics
    });
});
connection.onCompletion(function () {
    return [
        { label: "print", kind: browser_1.CompletionItemKind.Function },
        { label: "if", kind: browser_1.CompletionItemKind.Keyword }
        // …
    ];
});
documents.listen(connection);
connection.listen();
