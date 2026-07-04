import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkerMessage, WorkerRequest } from "@/lib/ide/browser-lsp/protocol";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

class FakeWorker {
    static instances: FakeWorker[] = [];

    readonly messages: WorkerRequest[] = [];
    readonly manualMethods = new Set<WorkerRequest["method"]>();
    onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    terminated = false;

    constructor() {
        FakeWorker.instances.push(this);
    }

    postMessage(message: WorkerRequest) {
        this.messages.push(message);

        if (!this.manualMethods.has(message.method)) {
            const result = message.method === "requestCompletion" ? [] : undefined;
            queueMicrotask(() => this.respond(message.id, result));
        }
    }

    respond(id: number, result?: unknown) {
        this.onmessage?.({ data: { type: "response", id, result } } as MessageEvent<WorkerMessage>);
    }

    terminate() {
        this.terminated = true;
    }
}

describe("WynntilsLspClient", () => {
    beforeEach(() => {
        FakeWorker.instances = [];
        vi.stubGlobal("Worker", FakeWorker);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("uses the typed worker protocol for requests", async () => {
        const client = new WynntilsLspClient(createRepresentativeCatalog());
        await client.connect();

        const worker = FakeWorker.instances[0];
        expect(worker.messages[0].method).toBe("initialize");

        const completionPromise = client.requestCompletion("inmemory://test", { line: 0, character: 1 });
        await expect(completionPromise).resolves.toEqual([]);
        expect(worker.messages.at(-1)?.method).toBe("requestCompletion");

        client.dispose();
        expect(worker.terminated).toBe(true);
    });

    it("coalesces document text without resolving until the newest sync finishes", async () => {
        const client = new WynntilsLspClient(createRepresentativeCatalog());
        await client.connect();
        const worker = FakeWorker.instances[0];
        worker.manualMethods.add("syncDocument");

        let firstResolved = false;
        const first = client.syncDocument("inmemory://test", "first").then(() => {
            firstResolved = true;
        });
        await vi.waitFor(() => expect(worker.messages.at(-1)?.method).toBe("syncDocument"));
        const firstRequest = worker.messages.at(-1)!;

        const second = client.syncDocument("inmemory://test", "second");
        await new Promise((resolve) => setTimeout(resolve, 0));
        worker.respond(firstRequest.id);
        await vi.waitFor(() => expect(worker.messages.at(-1)).not.toBe(firstRequest));

        expect(firstResolved).toBe(false);
        const secondRequest = worker.messages.at(-1)!;
        expect(secondRequest).toMatchObject({ method: "syncDocument", text: "second" });

        worker.respond(secondRequest.id);
        await Promise.all([first, second]);
        expect(firstResolved).toBe(true);
        client.dispose();
    });

    it("rejects queued synchronization when the worker fails", async () => {
        const client = new WynntilsLspClient(createRepresentativeCatalog());
        await client.connect();
        const worker = FakeWorker.instances[0];
        worker.manualMethods.add("syncDocument");

        const sync = client.syncDocument("inmemory://test", "content");
        await vi.waitFor(() => expect(worker.messages.at(-1)?.method).toBe("syncDocument"));
        worker.onerror?.({ message: "worker exploded" } as ErrorEvent);

        await expect(sync).rejects.toThrow("worker exploded");
        expect(worker.terminated).toBe(true);
    });
});
