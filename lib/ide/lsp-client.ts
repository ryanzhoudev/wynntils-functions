import {
    LspCompletionItem,
    LspHover,
    LspPosition,
    LspPublishDiagnosticsParams,
    LspSignatureHelp,
} from "@/lib/ide/types";
import type {
    WorkerMessage,
    WorkerRequestFor,
    WorkerRequestMethod,
    WorkerRequestParams,
    WorkerResultByMethod,
} from "@/lib/ide/browser-lsp/protocol";
import { FunctionCatalogResponse } from "@/lib/types";

type DiagnosticsHandler = (params: LspPublishDiagnosticsParams) => void;

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
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
    private static readonly REQUEST_TIMEOUT_MS = 30_000;
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

        const worker = new Worker(new URL("./browser-lsp/worker.ts", import.meta.url), {
            type: "module",
        });
        this.worker = worker;

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
            this.handleWorkerMessage(event.data);
        };

        worker.onerror = (event) => {
            this.handleWorkerFailure(new Error(event.message || "Browser LSP worker failed"), worker);
        };

        worker.onmessageerror = () => {
            this.handleWorkerFailure(new Error("Browser LSP worker returned an unreadable message"), worker);
        };

        this.connectPromise = this.request("initialize", { catalog: this.catalog }).catch((error) => {
            this.handleWorkerFailure(
                error instanceof Error ? error : new Error("Browser LSP initialization failed"),
                worker,
            );
            throw error;
        });

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
                queued.text = text;
                queued.resolvers.push({ resolve, reject });
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

    async requestCompletion(
        uri: string,
        position: LspPosition,
        triggerCharacter?: string,
    ): Promise<LspCompletionItem[]> {
        await this.connect();

        return this.request("requestCompletion", {
            uri,
            position,
            triggerCharacter,
        });
    }

    async requestHover(uri: string, position: LspPosition): Promise<LspHover | null> {
        await this.connect();

        return this.request("requestHover", { uri, position });
    }

    async requestSignatureHelp(uri: string, position: LspPosition): Promise<LspSignatureHelp | null> {
        await this.connect();

        return this.request("requestSignatureHelp", { uri, position });
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

        this.pendingRequests.forEach((pending) => {
            clearTimeout(pending.timeoutId);
            pending.reject(new Error("LSP client disposed"));
        });
        this.pendingRequests.clear();
        this.diagnosticsHandlers.clear();

        if (this.worker) {
            this.worker.terminate();
        }

        this.worker = null;
        this.connectPromise = null;
    }

    private request<Method extends WorkerRequestMethod>(
        method: Method,
        params: WorkerRequestParams<Method>,
    ): Promise<WorkerResultByMethod[Method]> {
        if (!this.worker) {
            return Promise.reject(new Error("Browser LSP worker is not running"));
        }

        const id = this.requestId++;

        return new Promise<WorkerResultByMethod[Method]>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Browser LSP request '${method}' timed out`));
            }, WynntilsLspClient.REQUEST_TIMEOUT_MS);

            this.pendingRequests.set(id, {
                resolve: (value) => resolve(value as WorkerResultByMethod[Method]),
                reject,
                timeoutId,
            });
            const message = { id, method, ...params } as WorkerRequestFor<Method>;
            this.worker?.postMessage(message);
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
                latest.resolvers.forEach(({ reject }) =>
                    reject(error instanceof Error ? error : new Error("Document sync failed")),
                );
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
        clearTimeout(pending.timeoutId);

        if (message.error) {
            pending.reject(new Error(message.error));
            return;
        }

        pending.resolve(message.result);
    }

    private handleWorkerFailure(error: Error, failedWorker = this.worker) {
        if (failedWorker !== this.worker) {
            return;
        }

        this.pendingRequests.forEach((pending) => {
            clearTimeout(pending.timeoutId);
            pending.reject(error);
        });
        this.pendingRequests.clear();

        this.queuedDocumentSyncs.forEach((queued) => {
            queued.resolvers.forEach(({ reject }) => reject(error));
        });
        this.queuedDocumentSyncs.clear();

        this.worker?.terminate();
        this.worker = null;
        this.connectPromise = null;
    }
}
