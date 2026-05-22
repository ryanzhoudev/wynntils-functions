import {
    LspCompletionItem,
    LspHover,
    LspPosition,
    LspPublishDiagnosticsParams,
    LspSignatureHelp,
} from "@/lib/ide/types";
import { FunctionCatalogResponse } from "@/lib/types";

type DiagnosticsHandler = (params: LspPublishDiagnosticsParams) => void;

type WorkerResponse = {
    type: "response";
    id: number;
    result?: unknown;
    error?: string;
};

type WorkerDiagnostics = {
    type: "diagnostics";
    params: LspPublishDiagnosticsParams;
};

type WorkerMessage = WorkerResponse | WorkerDiagnostics;

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
};

type QueuedDocumentSync = {
    text: string;
    resolvers: Array<{
        resolve: () => void;
        reject: (error: Error) => void;
    }>;
    isFlushing: boolean;
};

export class WynntilsLspClient {
    private worker: Worker | null = null;
    private requestId = 1;
    private connectPromise: Promise<void> | null = null;
    private readonly pendingRequests = new Map<number, PendingRequest>();
    private readonly queuedDocumentSyncs = new Map<string, QueuedDocumentSync>();
    private readonly diagnosticsHandlers = new Set<DiagnosticsHandler>();

    constructor(private catalog: FunctionCatalogResponse) {}

    async connect() {
        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.worker = new Worker(new URL("./browser-lsp/worker.ts", import.meta.url), {
            type: "module",
        });

        this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (event) => {
            const error = new Error(event.message || "Browser LSP worker failed");

            this.pendingRequests.forEach((pending) => pending.reject(error));
            this.pendingRequests.clear();
            this.connectPromise = null;
        };

        this.connectPromise = this.request("initialize", { catalog: this.catalog }).then(() => undefined);

        return this.connectPromise;
    }

    async updateCatalog(catalog: FunctionCatalogResponse) {
        this.catalog = catalog;
        await this.connect();
        await this.request("updateCatalog", { catalog });
    }

    async syncDocument(uri: string, text: string) {
        await this.connect();

        return new Promise<void>((resolve, reject) => {
            const queued = this.queuedDocumentSyncs.get(uri);

            if (queued) {
                queued.resolvers.forEach(({ resolve }) => resolve());
                queued.text = text;
                queued.resolvers = [{ resolve, reject }];
                return;
            }

            this.queuedDocumentSyncs.set(uri, {
                text,
                resolvers: [{ resolve, reject }],
                isFlushing: false,
            });

            this.flushDocumentSync(uri);
        });
    }

    async closeDocument(uri: string) {
        await this.connect();
        await this.request("closeDocument", { uri });
    }

    async requestCompletion(uri: string, position: LspPosition, triggerCharacter?: string): Promise<LspCompletionItem[]> {
        await this.connect();

        return (await this.request("requestCompletion", {
            uri,
            position,
            triggerCharacter,
        })) as LspCompletionItem[];
    }

    async requestHover(uri: string, position: LspPosition): Promise<LspHover | null> {
        await this.connect();

        return (await this.request("requestHover", { uri, position })) as LspHover | null;
    }

    async requestSignatureHelp(uri: string, position: LspPosition): Promise<LspSignatureHelp | null> {
        await this.connect();

        return (await this.request("requestSignatureHelp", { uri, position })) as LspSignatureHelp | null;
    }

    onDiagnostics(handler: DiagnosticsHandler) {
        this.diagnosticsHandlers.add(handler);

        return () => {
            this.diagnosticsHandlers.delete(handler);
        };
    }

    dispose() {
        this.queuedDocumentSyncs.forEach((queued) => {
            queued.resolvers.forEach(({ reject }) => reject(new Error("LSP client disposed")));
        });
        this.queuedDocumentSyncs.clear();

        this.pendingRequests.forEach((pending) => pending.reject(new Error("LSP client disposed")));
        this.pendingRequests.clear();
        this.diagnosticsHandlers.clear();

        if (this.worker) {
            this.worker.terminate();
        }

        this.worker = null;
        this.connectPromise = null;
    }

    private request(method: string, params?: Record<string, unknown>) {
        if (!this.worker) {
            return Promise.reject(new Error("Browser LSP worker is not running"));
        }

        const id = this.requestId++;

        return new Promise<unknown>((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.worker?.postMessage({ id, method, ...params });
        });
    }

    private flushDocumentSync(uri: string) {
        const queued = this.queuedDocumentSyncs.get(uri);

        if (!queued || queued.isFlushing) {
            return;
        }

        queued.isFlushing = true;
        const text = queued.text;

        void this.request("syncDocument", { uri, text })
            .then(() => {
                const latest = this.queuedDocumentSyncs.get(uri);

                if (!latest) {
                    return;
                }

                if (latest.text !== text) {
                    latest.isFlushing = false;
                    this.flushDocumentSync(uri);
                    return;
                }

                this.queuedDocumentSyncs.delete(uri);
                latest.resolvers.forEach(({ resolve }) => resolve());
            })
            .catch((error) => {
                const latest = this.queuedDocumentSyncs.get(uri);

                if (!latest) {
                    return;
                }

                this.queuedDocumentSyncs.delete(uri);
                latest.resolvers.forEach(({ reject }) => reject(error instanceof Error ? error : new Error("Document sync failed")));
            });
    }

    private handleWorkerMessage(message: WorkerMessage) {
        if (message.type === "diagnostics") {
            this.diagnosticsHandlers.forEach((handler) => handler(message.params));
            return;
        }

        const pending = this.pendingRequests.get(message.id);

        if (!pending) {
            return;
        }

        this.pendingRequests.delete(message.id);

        if (message.error) {
            pending.reject(new Error(message.error));
            return;
        }

        pending.resolve(message.result);
    }
}
