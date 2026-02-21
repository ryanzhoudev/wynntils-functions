import {
    LspCompletionItem,
    LspCompletionList,
    LspHover,
    LspPosition,
    LspPublishDiagnosticsParams,
} from "@/lib/ide/types";

type JsonRpcRequest = {
    jsonrpc: "2.0";
    id: number;
    method: string;
    params?: unknown;
};

type JsonRpcNotification = {
    jsonrpc: "2.0";
    method: string;
    params?: unknown;
};

type JsonRpcResponse = {
    jsonrpc: "2.0";
    id: number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
};

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
};

type DiagnosticsHandler = (params: LspPublishDiagnosticsParams) => void;

function isResponseMessage(message: unknown): message is JsonRpcResponse {
    if (typeof message !== "object" || message === null) {
        return false;
    }

    return "id" in message && ("result" in message || "error" in message);
}

function isNotificationMessage(message: unknown): message is JsonRpcNotification {
    if (typeof message !== "object" || message === null) {
        return false;
    }

    return "method" in message && !("id" in message);
}

function toErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown LSP error";
}

export class WynntilsLspClient {
    private readonly endpoint: string;

    private websocket: WebSocket | null = null;
    private requestId = 1;
    private connectPromise: Promise<void> | null = null;
    private isInitialized = false;

    private readonly pendingRequests = new Map<number, PendingRequest>();
    private readonly diagnosticsHandlers = new Set<DiagnosticsHandler>();

    private readonly openedDocuments = new Map<string, number>();

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    private handleMessage(message: unknown) {
        if (isResponseMessage(message)) {
            const pending = this.pendingRequests.get(message.id);

            if (!pending) {
                return;
            }

            this.pendingRequests.delete(message.id);

            if (message.error) {
                pending.reject(new Error(message.error.message));
                return;
            }

            pending.resolve(message.result);
            return;
        }

        if (!isNotificationMessage(message)) {
            return;
        }

        if (message.method === "textDocument/publishDiagnostics") {
            const params = message.params as LspPublishDiagnosticsParams;

            this.diagnosticsHandlers.forEach((handler) => handler(params));
        }
    }

    private send(message: JsonRpcRequest | JsonRpcNotification) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            throw new Error("LSP websocket is not connected");
        }

        this.websocket.send(JSON.stringify(message));
    }

    private sendRequestInternal(method: string, params?: unknown) {
        const id = this.requestId++;

        return new Promise<unknown>((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            try {
                this.send({
                    jsonrpc: "2.0",
                    id,
                    method,
                    params,
                });
            } catch (error) {
                this.pendingRequests.delete(id);
                reject(error instanceof Error ? error : new Error(toErrorMessage(error)));
            }
        });
    }

    private async request(method: string, params?: unknown) {
        await this.connect();

        return this.sendRequestInternal(method, params);
    }

    private notifyInternal(method: string, params?: unknown) {
        this.send({
            jsonrpc: "2.0",
            method,
            params,
        });
    }

    private async notify(method: string, params?: unknown) {
        await this.connect();

        this.notifyInternal(method, params);
    }

    async connect() {
        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.connectPromise = new Promise<void>((resolve, reject) => {
            const websocket = new WebSocket(this.endpoint);
            this.websocket = websocket;

            websocket.onopen = () => {
                void this
                    .sendRequestInternal("initialize", {
                        processId: null,
                        rootUri: null,
                        capabilities: {
                            textDocument: {
                                completion: {
                                    completionItem: {
                                        snippetSupport: true,
                                        documentationFormat: ["markdown", "plaintext"],
                                    },
                                },
                                hover: {
                                    contentFormat: ["markdown", "plaintext"],
                                },
                            },
                        },
                        clientInfo: {
                            name: "wynntils-functions-web",
                            version: "1.0.0",
                        },
                        trace: "off",
                    })
                    .then(() => this.notifyInternal("initialized", {}))
                    .then(() => {
                        this.isInitialized = true;
                        resolve();
                    })
                    .catch((error) => {
                        this.isInitialized = false;
                        reject(error instanceof Error ? error : new Error(toErrorMessage(error)));
                    });
            };

            websocket.onmessage = (event) => {
                if (typeof event.data !== "string") {
                    return;
                }

                try {
                    const parsed = JSON.parse(event.data) as unknown;

                    if (Array.isArray(parsed)) {
                        parsed.forEach((entry) => this.handleMessage(entry));
                        return;
                    }

                    this.handleMessage(parsed);
                } catch {
                    // Ignore malformed messages.
                }
            };

            websocket.onerror = () => {
                if (!this.isInitialized) {
                    reject(new Error(`Failed to connect to LSP websocket: ${this.endpoint}`));
                }
            };

            websocket.onclose = () => {
                this.isInitialized = false;
                this.websocket = null;
                this.connectPromise = null;
                this.openedDocuments.clear();

                this.pendingRequests.forEach((pending) => pending.reject(new Error("LSP websocket closed")));
                this.pendingRequests.clear();
            };
        });

        return this.connectPromise;
    }

    async syncDocument(uri: string, text: string) {
        await this.connect();

        const currentVersion = this.openedDocuments.get(uri);

        if (!currentVersion) {
            this.openedDocuments.set(uri, 1);

            await this.notify("textDocument/didOpen", {
                textDocument: {
                    uri,
                    languageId: "wynntils",
                    version: 1,
                    text,
                },
            });
            return;
        }

        const nextVersion = currentVersion + 1;
        this.openedDocuments.set(uri, nextVersion);

        await this.notify("textDocument/didChange", {
            textDocument: {
                uri,
                version: nextVersion,
            },
            contentChanges: [
                {
                    text,
                },
            ],
        });
    }

    async closeDocument(uri: string) {
        if (!this.openedDocuments.has(uri)) {
            return;
        }

        this.openedDocuments.delete(uri);

        await this.notify("textDocument/didClose", {
            textDocument: {
                uri,
            },
        });
    }

    async requestCompletion(uri: string, position: LspPosition): Promise<LspCompletionItem[]> {
        const completionResult = (await this.request("textDocument/completion", {
            textDocument: {
                uri,
            },
            position,
            context: {
                triggerKind: 1,
            },
        })) as LspCompletionItem[] | LspCompletionList | null;

        if (!completionResult) {
            return [];
        }

        if (Array.isArray(completionResult)) {
            return completionResult;
        }

        return completionResult.items ?? [];
    }

    async requestHover(uri: string, position: LspPosition): Promise<LspHover | null> {
        const hoverResult = (await this.request("textDocument/hover", {
            textDocument: {
                uri,
            },
            position,
        })) as LspHover | null;

        return hoverResult ?? null;
    }

    onDiagnostics(handler: DiagnosticsHandler) {
        this.diagnosticsHandlers.add(handler);

        return () => {
            this.diagnosticsHandlers.delete(handler);
        };
    }

    dispose() {
        this.pendingRequests.forEach((pending) => pending.reject(new Error("LSP client disposed")));
        this.pendingRequests.clear();

        this.openedDocuments.clear();
        this.diagnosticsHandlers.clear();
        this.isInitialized = false;

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.close();
        }

        this.websocket = null;
        this.connectPromise = null;
    }
}
