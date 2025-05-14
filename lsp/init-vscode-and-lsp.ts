// src/lsp/init-vscode-and-lsp.ts

// --- Problematic static imports are correctly placed HERE ---
import "vscode/localExtensionHost"; // For side-effects, critical for API readiness
import {
    initialize as initializeVscodeServices,
    IEditorOverrideServices, // Assuming this is the correct type name and path
    // If IEditorOverrideServices is not found, you might need to pass {} and let TS infer,
    // or find its exact export location from @codingame/monaco-vscode-api
} from "@codingame/monaco-vscode-api";

// LSP Client related imports
import { MonacoLanguageClient } from "monaco-languageclient";
import {
    CloseAction,
    ErrorAction,
    MessageTransports,
    Disposable as LspDisposable,
} from "vscode-languageclient/browser";
import { BrowserMessageReader, BrowserMessageWriter } from "vscode-jsonrpc/browser";

let languageClientInstance: MonacoLanguageClient | null = null; // Module-level instance

async function ensureVscodeServicesInitialized(): Promise<void> {
    console.log("INIT_MODULE: Attempting to initialize VSCode API services...");
    const overrides: IEditorOverrideServices = {
        // Normally, for basic monaco-languageclient usage, an empty object is sufficient.
        // If 'initializeVscodeServices' strictly requires certain overrides,
        // they would need to be provided here.
    };
    await initializeVscodeServices(overrides);
    console.log("INIT_MODULE: VSCode API services initialized.");
}

async function startWynntilsLspClientInternal(): Promise<LspDisposable> {
    console.log("INIT_MODULE_LSP: startWynntilsLspClientInternal called.");

    if (languageClientInstance && languageClientInstance.isRunning()) {
        console.warn("INIT_MODULE_LSP: Client is already running. Returning no-op disposer for this call.");
        return { dispose: () => {} };
    }
    if (languageClientInstance) {
        // Stop previous instance if it exists but wasn't running
        console.log("INIT_MODULE_LSP: Stopping previous (non-running) client instance.");
        languageClientInstance.stop().catch((e) => console.error("INIT_MODULE_LSP: Error stopping old client", e));
        languageClientInstance = null;
    }

    const worker = new Worker(new URL("./worker.worker.ts", import.meta.url), {
        type: "module",
        name: "WynntilsLspWorker",
    });
    console.log("INIT_MODULE_LSP: Web Worker created:", worker);

    worker.onerror = (event) => {
        console.error("INIT_MODULE_LSP: Worker global error:", event.message, event);
    };
    worker.onmessageerror = (event) => {
        console.error("INIT_MODULE_LSP: Worker message error:", event);
    };

    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);
    const transports: MessageTransports = { reader, writer };

    languageClientInstance = new MonacoLanguageClient({
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
    console.log("INIT_MODULE_LSP: MonacoLanguageClient instance created.");

    console.log("INIT_MODULE_LSP: Starting MonacoLanguageClient...");
    const startPromise = languageClientInstance.start();

    if (startPromise && typeof (startPromise as any).then === "function") {
        (startPromise as Promise<void>)
            .then(() => {
                console.log("INIT_MODULE_LSP: MonacoLanguageClient is ready and connected.");
            })
            .catch((error) => {
                console.error("INIT_MODULE_LSP: MonacoLanguageClient failed to start or connect:", error);
                // Clean up if start fails
                languageClientInstance
                    ?.stop()
                    .catch((e) => console.error("INIT_MODULE_LSP: Error stopping client after start failure", e));
                languageClientInstance = null;
                worker.terminate();
            });
    } else {
        console.warn(
            "INIT_MODULE_LSP: MonacoLanguageClient.start() did not return a promise. Assuming synchronous start or relying on internal readiness events.",
        );
    }

    return {
        dispose: () => {
            console.log("INIT_MODULE_LSP: Disposing client and worker (called from LspDisposable).");
            if (languageClientInstance) {
                languageClientInstance
                    .stop()
                    .then(() => console.log("INIT_MODULE_LSP: MonacoLanguageClient stopped successfully."))
                    .catch((e) => console.error("INIT_MODULE_LSP: Error during MonacoLanguageClient.stop()", e))
                    .finally(() => {
                        languageClientInstance = null; // Clear the instance
                    });
            }
            worker.terminate();
            console.log("INIT_MODULE_LSP: Worker terminated.");
        },
    };
}

// This is the single exported function that ide.tsx will dynamically import and call
export async function initializeAndStartLsp(): Promise<LspDisposable> {
    console.log("INIT_MODULE_EXPORT: initializeAndStartLsp called.");
    // Step 1: Ensure VSCode services are up
    await ensureVscodeServicesInitialized();
    // Step 2: Start the LSP client
    return startWynntilsLspClientInternal();
}
