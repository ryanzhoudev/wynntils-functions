import { createCatalogFromResponse, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { createFunctionCompletionItems } from "@/lib/ide/browser-lsp/completions";
import { buildDiagnostics } from "@/lib/ide/browser-lsp/diagnostics";
import { createHoverForPosition } from "@/lib/ide/browser-lsp/hover";
import { createTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { FunctionCatalogResponse } from "@/lib/types";
import { LspCompletionItem, LspHover, LspPosition, LspPublishDiagnosticsParams } from "@/lib/ide/types";

type DiagnosticsHandler = (params: LspPublishDiagnosticsParams) => void;

export class WynntilsBrowserLspService {
    private catalog: FunctionsCatalog;
    private completionItems: LspCompletionItem[];
    private readonly documents = new Map<string, string>();
    private readonly diagnosticsHandlers = new Set<DiagnosticsHandler>();

    constructor(catalogResponse: FunctionCatalogResponse) {
        this.catalog = createCatalogFromResponse(catalogResponse);
        this.completionItems = createFunctionCompletionItems(this.catalog);
    }

    updateCatalog(catalogResponse: FunctionCatalogResponse) {
        this.catalog = createCatalogFromResponse(catalogResponse);
        this.completionItems = createFunctionCompletionItems(this.catalog);

        for (const [uri, text] of this.documents) {
            this.publishDiagnostics(uri, text);
        }
    }

    connect() {
        return Promise.resolve();
    }

    syncDocument(uri: string, text: string) {
        this.documents.set(uri, text);
        this.publishDiagnostics(uri, text);

        return Promise.resolve();
    }

    closeDocument(uri: string) {
        this.documents.delete(uri);
        this.emitDiagnostics({ uri, diagnostics: [] });

        return Promise.resolve();
    }

    requestCompletion(uri: string, position: LspPosition, triggerCharacter?: string): Promise<LspCompletionItem[]> {
        const documentText = this.documents.get(uri);

        if (documentText && triggerCharacter === ";" && isVariableDeclarationLine(documentText, position.line)) {
            return Promise.resolve([]);
        }

        return Promise.resolve(this.completionItems);
    }

    requestHover(uri: string, position: LspPosition): Promise<LspHover | null> {
        const documentText = this.documents.get(uri);

        if (!documentText) {
            return Promise.resolve(null);
        }

        const document = createTextDocument(uri, documentText);

        return Promise.resolve(createHoverForPosition(document, position, this.catalog));
    }

    onDiagnostics(handler: DiagnosticsHandler) {
        this.diagnosticsHandlers.add(handler);

        return () => {
            this.diagnosticsHandlers.delete(handler);
        };
    }

    dispose() {
        this.documents.clear();
        this.diagnosticsHandlers.clear();
    }

    private publishDiagnostics(uri: string, text: string) {
        const document = createTextDocument(uri, text);
        const diagnostics = buildDiagnostics(document, this.catalog);

        this.emitDiagnostics({ uri, diagnostics });
    }

    private emitDiagnostics(params: LspPublishDiagnosticsParams) {
        this.diagnosticsHandlers.forEach((handler) => handler(params));
    }
}

function isVariableDeclarationLine(documentText: string, lineNumber: number) {
    const document = createTextDocument("inmemory://wynntils/check.wynntils", documentText);
    const lineStartOffset = document.offsetAt({ line: lineNumber, character: 0 });
    const lineEndOffset =
        lineNumber + 1 < document.lineCount
            ? document.offsetAt({ line: lineNumber + 1, character: 0 })
            : documentText.length;
    const lineText = documentText.slice(lineStartOffset, lineEndOffset);

    return /^\s*let\s+/.test(lineText);
}
