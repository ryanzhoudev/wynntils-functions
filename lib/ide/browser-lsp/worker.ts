import { WynntilsBrowserLspService } from "@/lib/ide/browser-lsp/service";
import { FunctionCatalogResponse } from "@/lib/types";
import { LspPosition } from "@/lib/ide/types";

type WorkerRequest =
    | {
          id: number;
          method: "initialize";
          catalog: FunctionCatalogResponse;
      }
    | {
          id: number;
          method: "updateCatalog";
          catalog: FunctionCatalogResponse;
      }
    | {
          id: number;
          method: "syncDocument";
          uri: string;
          text: string;
      }
    | {
          id: number;
          method: "closeDocument";
          uri: string;
      }
    | {
          id: number;
          method: "requestCompletion";
          uri: string;
          position: LspPosition;
          triggerCharacter?: string;
      }
    | {
          id: number;
          method: "requestHover";
          uri: string;
          position: LspPosition;
      }
    | {
          id: number;
          method: "requestSignatureHelp";
          uri: string;
          position: LspPosition;
      }
    | {
          id: number;
          method: "dispose";
      };

let service: WynntilsBrowserLspService | null = null;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    const message = event.data;

    try {
        switch (message.method) {
            case "initialize":
                service?.dispose();
                service = new WynntilsBrowserLspService(message.catalog);
                service.onDiagnostics((params) => {
                    self.postMessage({
                        type: "diagnostics",
                        params,
                    });
                });
                await service.connect();
                self.postMessage({ type: "response", id: message.id, result: undefined });
                break;

            case "updateCatalog":
                requireService().updateCatalog(message.catalog);
                self.postMessage({ type: "response", id: message.id, result: undefined });
                break;

            case "syncDocument":
                await requireService().syncDocument(message.uri, message.text);
                self.postMessage({ type: "response", id: message.id, result: undefined });
                break;

            case "closeDocument":
                await requireService().closeDocument(message.uri);
                self.postMessage({ type: "response", id: message.id, result: undefined });
                break;

            case "requestCompletion":
                self.postMessage({
                    type: "response",
                    id: message.id,
                    result: await requireService().requestCompletion(
                        message.uri,
                        message.position,
                        message.triggerCharacter,
                    ),
                });
                break;

            case "requestHover":
                self.postMessage({
                    type: "response",
                    id: message.id,
                    result: await requireService().requestHover(message.uri, message.position),
                });
                break;

            case "requestSignatureHelp":
                self.postMessage({
                    type: "response",
                    id: message.id,
                    result: await requireService().requestSignatureHelp(message.uri, message.position),
                });
                break;

            case "dispose":
                service?.dispose();
                service = null;
                self.postMessage({ type: "response", id: message.id, result: undefined });
                break;
        }
    } catch (error) {
        self.postMessage({
            type: "response",
            id: message.id,
            error: error instanceof Error ? error.message : "Browser LSP worker failed",
        });
    }
};

function requireService() {
    if (!service) {
        throw new Error("Browser LSP worker has not been initialized");
    }

    return service;
}

export {};
