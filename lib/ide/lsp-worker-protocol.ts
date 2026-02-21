import { CompileResult, FunctionMetadata, LspCompletionItem, LspDiagnostic, LspHover } from "@/lib/ide/types";

type WorkerMessageBase = {
    id: string;
};

export type WorkerRequest =
    | (WorkerMessageBase & {
          type: "setCatalog";
          payload: { functions: FunctionMetadata[] };
      })
    | (WorkerMessageBase & {
          type: "diagnostics";
          payload: { text: string };
      })
    | (WorkerMessageBase & {
          type: "completion";
          payload: { text: string };
      })
    | (WorkerMessageBase & {
          type: "hover";
          payload: { text: string; offset: number };
      })
    | (WorkerMessageBase & {
          type: "compile";
          payload: { text: string };
      });

export type WorkerSuccessResponse =
    | (WorkerMessageBase & {
          type: "setCatalog";
          ok: true;
          payload: { count: number };
      })
    | (WorkerMessageBase & {
          type: "diagnostics";
          ok: true;
          payload: { diagnostics: LspDiagnostic[] };
      })
    | (WorkerMessageBase & {
          type: "completion";
          ok: true;
          payload: { items: LspCompletionItem[] };
      })
    | (WorkerMessageBase & {
          type: "hover";
          ok: true;
          payload: { hover: LspHover | null };
      })
    | (WorkerMessageBase & {
          type: "compile";
          ok: true;
          payload: CompileResult;
      });

export type WorkerErrorResponse = WorkerMessageBase & {
    ok: false;
    type: WorkerRequest["type"];
    error: string;
};

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;
