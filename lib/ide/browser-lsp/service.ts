import { createCatalogFromResponse, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { findActiveCallContext } from "@/lib/ide/browser-lsp/call-context";
import { createFunctionCompletionItems } from "@/lib/ide/browser-lsp/completions";
import { buildDiagnostics } from "@/lib/ide/browser-lsp/diagnostics";
import { resolveArgumentSlot, resolveCompletionType } from "@/lib/ide/browser-lsp/function-arguments";
import { createHoverForPosition } from "@/lib/ide/browser-lsp/hover";
import { createSignatureHelp } from "@/lib/ide/browser-lsp/signature-help";
import { createTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { FunctionCatalogResponse } from "@/lib/types";
import { LspCompletionItem, LspHover, LspPosition, LspPublishDiagnosticsParams, LspSignatureHelp } from "@/lib/ide/types";

type DiagnosticsHandler = (params: LspPublishDiagnosticsParams) => void;

export class WynntilsBrowserLspService {
    private catalog: FunctionsCatalog;
    private readonly documents = new Map<string, string>();
    private readonly diagnosticsHandlers = new Set<DiagnosticsHandler>();

    constructor(catalogResponse: FunctionCatalogResponse) {
        this.catalog = createCatalogFromResponse(catalogResponse);
    }

    updateCatalog(catalogResponse: FunctionCatalogResponse) {
        this.catalog = createCatalogFromResponse(catalogResponse);

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

        if (triggerCharacter === ";" || triggerCharacter === "(") {
            return Promise.resolve([]);
        }

        const document = documentText ? createTextDocument(uri, documentText) : null;
        const callContext = document ? findActiveCallContext(document, position) : null;

        const expectedType = callContext ? this.resolveExpectedArgumentType(callContext.functionName, callContext.activeParameter) : undefined;

        return Promise.resolve(createFunctionCompletionItems(this.catalog, { expectedType }));
    }

    requestHover(uri: string, position: LspPosition): Promise<LspHover | null> {
        const documentText = this.documents.get(uri);

        if (!documentText) {
            return Promise.resolve(null);
        }

        const document = createTextDocument(uri, documentText);

        return Promise.resolve(createHoverForPosition(document, position, this.catalog));
    }

    requestSignatureHelp(uri: string, position: LspPosition): Promise<LspSignatureHelp | null> {
        const documentText = this.documents.get(uri);

        if (!documentText) {
            return Promise.resolve(null);
        }

        const document = createTextDocument(uri, documentText);

        return Promise.resolve(createSignatureHelp(document, position, this.catalog));
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

    private resolveExpectedArgumentType(functionName: string, activeParameter: number) {
        const metadata = this.catalog.findByName(functionName);

        if (!metadata) {
            return undefined;
        }

        return resolveCompletionType(resolveArgumentSlot(metadata.arguments, activeParameter)?.argument);
    }
}
