import type {
    LspCompletionItem,
    LspHover,
    LspPosition,
    LspPublishDiagnosticsParams,
    LspSignatureHelp,
} from "@/lib/ide/types";
import type { FunctionCatalogResponse } from "@/lib/types";

export type WorkerRequest =
    | { id: number; method: "initialize"; catalog: FunctionCatalogResponse }
    | { id: number; method: "updateCatalog"; catalog: FunctionCatalogResponse }
    | { id: number; method: "syncDocument"; uri: string; text: string }
    | { id: number; method: "closeDocument"; uri: string }
    | { id: number; method: "requestCompletion"; uri: string; position: LspPosition; triggerCharacter?: string }
    | { id: number; method: "requestHover"; uri: string; position: LspPosition }
    | { id: number; method: "requestSignatureHelp"; uri: string; position: LspPosition }
    | { id: number; method: "dispose" };

export type WorkerRequestMethod = WorkerRequest["method"];
export type WorkerRequestFor<Method extends WorkerRequestMethod> = Extract<WorkerRequest, { method: Method }>;
export type WorkerRequestParams<Method extends WorkerRequestMethod> = Omit<WorkerRequestFor<Method>, "id" | "method">;

export type WorkerResultByMethod = {
    initialize: void;
    updateCatalog: void;
    syncDocument: void;
    closeDocument: void;
    requestCompletion: LspCompletionItem[];
    requestHover: LspHover | null;
    requestSignatureHelp: LspSignatureHelp | null;
    dispose: void;
};

export type WorkerResponse = {
    type: "response";
    id: number;
    result?: unknown;
    error?: string;
};

export type WorkerDiagnostics = {
    type: "diagnostics";
    params: LspPublishDiagnosticsParams;
};

export type WorkerMessage = WorkerResponse | WorkerDiagnostics;
