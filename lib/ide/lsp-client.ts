import { CompileResult, FunctionMetadata, LspCompletionItem, LspDiagnostic, LspHover } from "@/lib/ide/types";
import { WorkerRequest, WorkerResponse } from "@/lib/ide/lsp-worker-protocol";

type PendingResolver = {
    resolve: (value: WorkerResponse) => void;
    reject: (error: Error) => void;
};

function createMessageId() {
    return crypto.randomUUID();
}

function isWorkerErrorResponse(response: WorkerResponse): response is Extract<WorkerResponse, { ok: false }> {
    return response.ok === false;
}

export class WynntilsLspClient {
    private worker: Worker;
    private pending = new Map<string, PendingResolver>();

    constructor() {
        this.worker = new Worker(new URL("./wynntils-lsp.worker.ts", import.meta.url), { type: "module" });

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const response = event.data;
            const resolver = this.pending.get(response.id);

            if (!resolver) {
                return;
            }

            this.pending.delete(response.id);
            resolver.resolve(response);
        };

        this.worker.onerror = (event) => {
            this.pending.forEach((resolver) => {
                resolver.reject(new Error(event.message));
            });
            this.pending.clear();
        };
    }

    private async send<T extends WorkerRequest["type"]>(
        type: T,
        payload: Extract<WorkerRequest, { type: T }>["payload"],
    ): Promise<Extract<WorkerResponse, { type: T }>> {
        const id = createMessageId();

        const request = {
            id,
            type,
            payload,
        } as Extract<WorkerRequest, { type: T }>;

        const response = await new Promise<WorkerResponse>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage(request);
        });

        if (isWorkerErrorResponse(response)) {
            throw new Error(response.error);
        }

        return response as Extract<WorkerResponse, { type: T }>;
    }

    async setCatalog(functions: FunctionMetadata[]) {
        const response = await this.send("setCatalog", { functions });
        return response.payload;
    }

    async getDiagnostics(text: string): Promise<LspDiagnostic[]> {
        const response = await this.send("diagnostics", { text });
        return response.payload.diagnostics;
    }

    async getCompletionItems(text: string): Promise<LspCompletionItem[]> {
        const response = await this.send("completion", { text });
        return response.payload.items;
    }

    async getHover(text: string, offset: number): Promise<LspHover | null> {
        const response = await this.send("hover", { text, offset });
        return response.payload.hover;
    }

    async compile(text: string): Promise<CompileResult> {
        const response = await this.send("compile", { text });
        return response.payload;
    }

    dispose() {
        this.worker.terminate();
        this.pending.clear();
    }
}
