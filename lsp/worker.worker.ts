// src/lsp/worker.worker.ts (Full version with robust logging)
import {
    createConnection,
    BrowserMessageReader,
    BrowserMessageWriter,
    TextDocuments,
    InitializeParams,
    TextDocumentSyncKind,
    CompletionItem,
    CompletionItemKind,
    InitializeResult,
    TextDocumentPositionParams,
    MarkupKind,
    SignatureHelp,
    SignatureHelpParams,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";

console.log("LSP Worker: Script executing."); // Top-level log

const connection = createConnection(new BrowserMessageReader(self), new BrowserMessageWriter(self));
console.log("LSP Worker: Connection created.");

const documents = new TextDocuments(TextDocument);
console.log("LSP Worker: TextDocuments manager created.");

let functionData: any[] = [];
let argumentData: any[] = [];

connection.onInitialize((_params: InitializeParams): InitializeResult => {
    console.log("LSP Worker: onInitialize called. Params:", _params);
    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                triggerCharacters: ["(", ";", "."], // Added dot
                resolveProvider: true, // Good for details on demand
            },
            signatureHelpProvider: {
                triggerCharacters: ["(", ","], // Comma is important
            },
        },
    };
    console.log("LSP Worker: onInitialize returning capabilities:", result.capabilities);
    return result;
});

connection.onInitialized(async () => {
    console.log("LSP Worker: onInitialized - Attempting to fetch /api/functions");
    try {
        const res = await fetch("/api/functions"); // Make sure this API route is working
        console.log("LSP Worker: Fetch response status:", res.status, res.statusText);
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`LSP Worker: Failed to fetch function data. Status: ${res.status}, Text: ${errorText}`);
            return;
        }
        const data = await res.json();
        // console.log("LSP Worker: Fetched data:", data); // Can be verbose
        if (data && data.functions && data.args) {
            functionData = data.functions;
            argumentData = data.args;
            console.log(
                `LSP Worker: Successfully populated ${functionData.length} functions and ${argumentData.length} args.`,
            );
        } else {
            console.error("LSP Worker: Invalid data structure from /api/functions. Received:", data);
        }
    } catch (error) {
        console.error("LSP Worker: CRITICAL ERROR fetching or parsing function data:", error);
    }
});

connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
    console.log("LSP Worker: onCompletion triggered. Params:", params, "Function data length:", functionData.length);
    try {
        if (!functionData || functionData.length === 0) {
            console.warn("LSP Worker: Completion requested but no function data available.");
            return [];
        }
        return functionData.map((fn: any) => ({
            label: fn.name,
            kind: CompletionItemKind.Function,
            insertText: `${fn.name}($0)`,
            insertTextFormat: 2, // SnippetString
            documentation: {
                kind: MarkupKind.Markdown,
                value: `**${fn.name}**\n\n*Returns*: \`${fn.returntype || "void"}\`\n\n${
                    fn.description || "No description."
                }`,
            },
            // detail: `Function ${fn.name}`, // Optional
        }));
    } catch (e) {
        console.error("LSP Worker: Error in onCompletion handler:", e);
        return [];
    }
});

connection.onSignatureHelp((params: SignatureHelpParams): SignatureHelp | null => {
    console.log("LSP Worker: onSignatureHelp triggered. Params:", params);
    try {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            console.warn("LSP Worker: SignatureHelp - document not found.");
            return null;
        }

        const lineContent = document.getText({
            start: { line: params.position.line, character: 0 },
            end: params.position,
        });

        // Very naive function name and argument count extraction
        const lParenPos = lineContent.lastIndexOf("(");
        if (lParenPos === -1) return null;

        const potentialFuncNameMatch = lineContent.substring(0, lParenPos).match(/(\b\w+)$/);
        if (!potentialFuncNameMatch) return null;

        const funcName = potentialFuncNameMatch[1];
        const activeFunction = functionData.find((f) => f.name === funcName);

        if (!activeFunction) {
            console.log(`LSP Worker: SignatureHelp - function ${funcName} not found in data.`);
            return null;
        }

        const funcArgs = argumentData
            .filter((arg) => arg.function_id === activeFunction.id) // Assuming function_id links args to functions
            .sort((a, b) => a.position - b.position); // Assuming 'position' field for order

        const textAfterLParen = lineContent.substring(lParenPos + 1);
        const activeParameter = (textAfterLParen.match(/,/g) || []).length;

        console.log(
            `LSP Worker: SignatureHelp for ${funcName}, args: ${funcArgs.length}, activeParam: ${activeParameter}`,
        );

        return {
            activeSignature: 0,
            activeParameter: activeParameter,
            signatures: [
                {
                    label: `${activeFunction.name}(${funcArgs
                        .map((arg: any) => `${arg.name}: ${arg.type}`)
                        .join(", ")})`,
                    documentation: {
                        kind: MarkupKind.Markdown,
                        value: `**${activeFunction.name}**\n\n${activeFunction.description}\n\n*Returns*: \`${activeFunction.returntype}\``,
                    },
                    parameters: funcArgs.map((arg: any) => ({
                        label: `${arg.name}: ${arg.type}`,
                        documentation: arg.description || `Type: ${arg.type}`,
                    })),
                },
            ],
        };
    } catch (e) {
        console.error("LSP Worker: Error in onSignatureHelp handler:", e);
        return null;
    }
});

documents.listen(connection);
console.log("LSP Worker: TextDocuments listening to connection.");

connection.listen();
console.log("LSP Worker: Connection listening."); // This should be one of the last logs from worker init

// self.onmessage removed if it was the PING/PONG test handler
