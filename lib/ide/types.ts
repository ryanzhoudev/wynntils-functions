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

export type FunctionMetadataArgument = {
    name: string;
    required: boolean;
    type: string;
    defaultValue?: string | null;
};

export type FunctionMetadata = {
    canonicalName: string;
    description: string;
    returnType: string;
    aliases: string[];
    arguments: FunctionMetadataArgument[];
};

export type LspDiagnosticSeverity = "error" | "warning" | "information" | "hint";

export type LspDiagnostic = {
    message: string;
    severity: LspDiagnosticSeverity;
    startOffset: number;
    endOffset: number;
};

export type LspCompletionItem = {
    label: string;
    detail: string;
    insertText: string;
};

export type LspHover = {
    markdown: string;
};

export type CompileResult = {
    code: string;
    errors: { off: number; msg: string }[];
};
