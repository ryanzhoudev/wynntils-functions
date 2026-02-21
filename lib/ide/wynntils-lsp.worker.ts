/// <reference lib="webworker" />

import { FunctionsCatalog } from "@/lib/ide/lsp-core/catalog";
import { compileSupersetToWynntils } from "@/lib/ide/lsp-core/compile";
import { createFunctionCompletionItems } from "@/lib/ide/lsp-core/completions";
import { buildDiagnostics } from "@/lib/ide/lsp-core/diagnostics";
import { createHoverForOffset } from "@/lib/ide/lsp-core/hover";
import { WorkerRequest, WorkerResponse } from "@/lib/ide/lsp-worker-protocol";

const catalog = new FunctionsCatalog();
let completionItems = createFunctionCompletionItems(catalog);

function postResponse(response: WorkerResponse) {
    self.postMessage(response);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const message = event.data;

    try {
        switch (message.type) {
            case "setCatalog": {
                catalog.setFunctions(message.payload.functions);
                completionItems = createFunctionCompletionItems(catalog);

                postResponse({
                    id: message.id,
                    type: message.type,
                    ok: true,
                    payload: { count: message.payload.functions.length },
                });
                return;
            }

            case "diagnostics": {
                const diagnostics = buildDiagnostics(message.payload.text, catalog);

                postResponse({
                    id: message.id,
                    type: message.type,
                    ok: true,
                    payload: { diagnostics },
                });
                return;
            }

            case "completion": {
                postResponse({
                    id: message.id,
                    type: message.type,
                    ok: true,
                    payload: { items: completionItems },
                });
                return;
            }

            case "hover": {
                const hover = createHoverForOffset(message.payload.text, message.payload.offset, catalog);

                postResponse({
                    id: message.id,
                    type: message.type,
                    ok: true,
                    payload: { hover },
                });
                return;
            }

            case "compile": {
                const compileResult = compileSupersetToWynntils(message.payload.text);

                postResponse({
                    id: message.id,
                    type: message.type,
                    ok: true,
                    payload: compileResult,
                });
                return;
            }
        }
    } catch (error) {
        postResponse({
            id: message.id,
            type: message.type,
            ok: false,
            error: error instanceof Error ? error.message : "Unknown worker error",
        });
    }
};

export {};
