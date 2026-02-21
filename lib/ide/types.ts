export type IdeFile = {
    id: string;
    name: string;
    content: string;
    updatedAt: number;
};

export type IdeWorkspace = {
    files: IdeFile[];
    activeFileId: string;
};

export type LspPosition = {
    line: number;
    character: number;
};

export type LspRange = {
    start: LspPosition;
    end: LspPosition;
};

export type LspDiagnostic = {
    range: LspRange;
    severity?: number;
    code?: number | string;
    source?: string;
    message: string;
};

export type LspPublishDiagnosticsParams = {
    uri: string;
    diagnostics: LspDiagnostic[];
};

export type LspTextEdit = {
    range: LspRange;
    newText: string;
};

export type LspMarkupContent = {
    kind: "plaintext" | "markdown";
    value: string;
};

export type LspMarkedString = string | { language: string; value: string };

export type LspCompletionItem = {
    label: string;
    kind?: number;
    detail?: string;
    documentation?: string | LspMarkupContent | LspMarkedString | LspMarkedString[];
    insertText?: string;
    insertTextFormat?: number;
    textEdit?: LspTextEdit;
};

export type LspCompletionList = {
    isIncomplete?: boolean;
    items: LspCompletionItem[];
};

export type LspHover = {
    contents: string | LspMarkupContent | LspMarkedString | LspMarkedString[];
    range?: LspRange;
};

export type CompileResult = {
    code: string;
    errors: { off: number; msg: string }[];
};
