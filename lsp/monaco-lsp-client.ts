// src/lsp/monaco-lsp-client.ts
import { MonacoLanguageClient } from "monaco-languageclient";
import {
    CloseAction,
    ErrorAction,
    MessageTransports,
    Disposable as LspDisposable,
} from "vscode-languageclient/browser";
import { BrowserMessageReader, BrowserMessageWriter } from "vscode-jsonrpc/browser";

let languageClient: MonacoLanguageClient | null = null; // Keep track of the client

export function startWynntilsLanguageClient(): LspDisposable {
    console.log("LSP_CLIENT_MODULE: startWynntilsLanguageClient called");

    // Prevent re-initialization if already running (simple check)
    if (languageClient && languageClient.isRunning()) {
        console.warn("LSP_CLIENT_MODULE: Client is already running. Returning a no-op disposer.");
        return { dispose: () => {} };
    }
    // If an old instance exists but isn't running, stop it.
    if (languageClient) {
        console.log("LSP_CLIENT_MODULE: Stopping previous non-running client instance.");
        languageClient.stop().catch((e) => console.error("LSP_CLIENT_MODULE: Error stopping old client", e));
        languageClient = null;
    }

    // 1) Spin-up the LSP in a WebWorker.
    // Path relative from this file (monaco-lsp-client.ts) to worker.worker.ts
    // If both are in src/lsp/, then './worker.worker.ts' is correct.
    const worker = new Worker(new URL("./worker.worker.ts", import.meta.url), {
        type: "module",
        name: "WynntilsLspWorker",
    });
    console.log("LSP_CLIENT_MODULE: Worker created:", worker);

    worker.onerror = (event) => {
        /* ... */
    };
    worker.onmessageerror = (event) => {
        /* ... */
    };

    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);
    const transports: MessageTransports = { reader, writer };

    languageClient = new MonacoLanguageClient({
        // Assign to the module-scoped variable
        name: "Wynntils LSP",
        clientOptions: {
            documentSelector: [{ language: "wynntils" }],
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.Restart }),
            },
        },
        messageTransports: transports,
    });

    console.log("LSP_CLIENT_MODULE: MonacoLanguageClient instance created. Starting...");
    const startPromise = languageClient.start();

    if (startPromise && typeof (startPromise as any).then === "function") {
        (startPromise as Promise<void>)
            .then(() => {
                console.log("LSP_CLIENT_MODULE: MonacoLanguageClient is ready (Promise resolved).");
            })
            .catch((error) => {
                console.error("LSP_CLIENT_MODULE: MonacoLanguageClient failed to start:", error);
                languageClient = null; // Clear on failure to allow retry
            });
    } else {
        console.log("LSP_CLIENT_MODULE: MonacoLanguageClient start() called (no promise returned or sync).");
    }

    return {
        dispose: () => {
            console.log("LSP_CLIENT_MODULE: Disposing MonacoLanguageClient and Worker...");
            if (languageClient) {
                languageClient
                    .stop()
                    .then(() => console.log("LSP_CLIENT_MODULE: MonacoLanguageClient stopped."))
                    .catch((err) => console.error("LSP_CLIENT_MODULE: Error stopping client:", err))
                    .finally(() => {
                        languageClient = null; // Allow re-creation
                    });
            }
            worker.terminate();
            console.log("LSP_CLIENT_MODULE: Worker terminated.");
        },
    };
}
