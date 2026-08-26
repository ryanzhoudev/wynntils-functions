"use client";

import Editor, { type Monaco as MonacoApi, OnMount } from "@monaco-editor/react";
import { CompiledOutputPanel, type CompileStatus } from "@/components/ide/compiled-output-panel";
import { ContextPanel } from "@/components/ide/context-panel";
import { DiagnosticsPanel } from "@/components/ide/diagnostics-panel";
import { IdeToolbar, type LspStatus } from "@/components/ide/ide-toolbar";
import { useIdeWorkspace } from "@/components/ide/use-ide-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import { WYNNTILS_LANGUAGE, ensureWynntilsLanguage, registerWynntilsProviders } from "@/lib/ide/monaco";
import { createCompiledIdeFileName, createIdeFileUri } from "@/lib/ide/workspace";
import { CompileResult, IdeFile, LspDiagnostic, LspSignatureHelp } from "@/lib/ide/types";
import { compileSupersetToWynntils } from "@/lib/ide/upstream-compile";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { Braces } from "lucide-react";
import type { IDisposable, editor as MonacoEditor } from "monaco-editor";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MARKER_OWNER = "wynntils-browser-lsp";
const EDITOR_HEIGHT = "calc(100vh - 11.75rem)";
const EDITOR_OPTIONS: MonacoEditor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    tabSize: 4,
    smoothScrolling: true,
    wordWrap: "off",
    automaticLayout: true,
    bracketPairColorization: { enabled: true },
    glyphMargin: true,
    renderValidationDecorations: "on",
    fixedOverflowWidgets: true,
    hover: { enabled: "on", delay: 120 },
    scrollbar: { alwaysConsumeMouseWheel: false },
    suggestOnTriggerCharacters: true,
    quickSuggestions: { strings: true, comments: false, other: true },
    scrollBeyondLastLine: false,
};

function mapDiagnosticSeverity(monaco: MonacoApi, severity?: number) {
    switch (severity) {
        case 1:
            return monaco.MarkerSeverity.Error;
        case 2:
            return monaco.MarkerSeverity.Warning;
        case 3:
            return monaco.MarkerSeverity.Info;
        case 4:
            return monaco.MarkerSeverity.Hint;
        default:
            return monaco.MarkerSeverity.Info;
    }
}

export default function WynntilsIde() {
    const functionCatalog = useFunctionCatalog();
    const lspClientRef = useRef<WynntilsLspClient | null>(null);
    const diagnosticsByUriRef = useRef<Map<string, LspDiagnostic[]>>(new Map());
    const {
        workspace,
        activeFile,
        setActiveFileId,
        addFile,
        createNewFile,
        renameActiveFile,
        duplicateActiveFile,
        deleteActiveFile,
        exportActiveFile,
        importFileFromDisk,
        updateActiveFileContent,
    } = useIdeWorkspace((file) => {
        const uri = createIdeFileUri(file.id);
        void lspClientRef.current?.closeDocument(uri);
        diagnosticsByUriRef.current.delete(uri);
    });

    const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
    const [compileStatus, setCompileStatus] = useState<CompileStatus | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [isCopyingCompiledOutput, setIsCopyingCompiledOutput] = useState(false);

    const [diagnosticMarkers, setDiagnosticMarkers] = useState<MonacoEditor.IMarkerData[]>([]);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [signatureHelp, setSignatureHelp] = useState<LspSignatureHelp | null>(null);

    const [lspStatus, setLspStatus] = useState<LspStatus>("connecting");
    const [lspError, setLspError] = useState<string | null>(null);

    const fileImportRef = useRef<HTMLInputElement>(null);

    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<MonacoApi | null>(null);
    const compiledOutputRef = useRef<HTMLDivElement | null>(null);
    const providerDisposablesRef = useRef<IDisposable[]>([]);
    const editorDisposablesRef = useRef<IDisposable[]>([]);
    const signatureHelpRequestRef = useRef(0);
    const signatureHelpFrameRef = useRef<number | null>(null);
    const signatureHelpInFlightRef = useRef(false);
    const signatureHelpQueuedRef = useRef(false);

    const activeUriRef = useRef<string | null>(null);
    const activeFileRef = useRef<IdeFile | null>(null);
    const lastActiveFileIdRef = useRef<string | null>(null);

    const activeFileId = activeFile?.id ?? null;

    const activeFileUri = useMemo(() => {
        return activeFileId ? createIdeFileUri(activeFileId) : null;
    }, [activeFileId]);

    useEffect(() => {
        activeFileRef.current = activeFile;
        activeUriRef.current = activeFileUri;
    }, [activeFile, activeFileUri]);

    const applyDiagnosticsForUri = useCallback((uri: string) => {
        const monaco = monacoRef.current;

        if (!monaco) {
            return;
        }

        const model = monaco.editor.getModel(monaco.Uri.parse(uri));

        if (!model) {
            return;
        }

        const diagnostics = diagnosticsByUriRef.current.get(uri) ?? [];

        const markers: MonacoEditor.IMarkerData[] = diagnostics.map((diagnostic) => ({
            severity: mapDiagnosticSeverity(monaco, diagnostic.severity),
            message: diagnostic.message,
            source: diagnostic.source,
            startLineNumber: diagnostic.range.start.line + 1,
            startColumn: diagnostic.range.start.character + 1,
            endLineNumber: diagnostic.range.end.line + 1,
            endColumn: diagnostic.range.end.character + 1,
        }));

        monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);

        if (activeUriRef.current === uri) {
            setDiagnosticMarkers(markers);
        }
    }, []);

    const ensureProvidersRegistered = useCallback(() => {
        const monaco = monacoRef.current;
        const lspClient = lspClientRef.current;

        if (!monaco || !lspClient || providerDisposablesRef.current.length > 0) {
            return;
        }

        providerDisposablesRef.current = registerWynntilsProviders(monaco, lspClient);
    }, []);

    const refreshSignatureHelp = useCallback(() => {
        if (signatureHelpFrameRef.current !== null) {
            return;
        }

        const runScheduledRefresh = () => {
            signatureHelpFrameRef.current = null;

            if (signatureHelpInFlightRef.current) {
                signatureHelpQueuedRef.current = true;
                return;
            }

            const editor = editorRef.current;
            const lspClient = lspClientRef.current;
            const activeUri = activeUriRef.current;
            const position = editor?.getPosition();

            if (!editor || !lspClient || !activeUri || !position) {
                signatureHelpRequestRef.current++;
                setSignatureHelp(null);
                return;
            }

            const requestId = ++signatureHelpRequestRef.current;
            signatureHelpInFlightRef.current = true;

            void lspClient
                .requestSignatureHelp(activeUri, {
                    line: position.lineNumber - 1,
                    character: position.column - 1,
                })
                .then((help) => {
                    if (requestId !== signatureHelpRequestRef.current || activeUri !== activeUriRef.current) {
                        return;
                    }

                    setSignatureHelp(help && help.signatures.length > 0 ? help : null);
                })
                .catch(() => {
                    if (requestId === signatureHelpRequestRef.current) {
                        setSignatureHelp(null);
                    }
                })
                .finally(() => {
                    signatureHelpInFlightRef.current = false;

                    if (signatureHelpQueuedRef.current) {
                        signatureHelpQueuedRef.current = false;
                        signatureHelpFrameRef.current = window.requestAnimationFrame(runScheduledRefresh);
                    }
                });
        };

        signatureHelpFrameRef.current = window.requestAnimationFrame(runScheduledRefresh);
    }, []);

    useEffect(() => {
        if (!functionCatalog.data) {
            window.queueMicrotask(() => {
                setLspStatus("connecting");
                setLspError(functionCatalog.error);
            });
        }
    }, [functionCatalog.data, functionCatalog.error]);

    useEffect(() => {
        if (!functionCatalog.data) {
            return;
        }

        const lspClient = new WynntilsLspClient(functionCatalog.data);
        let isDisposed = false;
        lspClientRef.current = lspClient;

        const unsubscribeDiagnostics = lspClient.onDiagnostics((params) => {
            diagnosticsByUriRef.current.set(params.uri, params.diagnostics ?? []);
            applyDiagnosticsForUri(params.uri);
        });

        window.queueMicrotask(() => {
            setLspStatus("connecting");
            setLspError(null);
        });

        void lspClient
            .connect()
            .then(() => {
                if (isDisposed) {
                    return;
                }

                setLspStatus("ready");
                ensureProvidersRegistered();

                if (activeFileRef.current && activeUriRef.current) {
                    void lspClient.syncDocument(activeUriRef.current, activeFileRef.current.content);
                }

                refreshSignatureHelp();
            })
            .catch((error) => {
                if (isDisposed) {
                    return;
                }

                setLspStatus("error");
                setLspError(error instanceof Error ? error.message : "Failed to start browser LSP");
            });

        return () => {
            isDisposed = true;
            unsubscribeDiagnostics();

            providerDisposablesRef.current.forEach((disposable) => disposable.dispose());
            providerDisposablesRef.current = [];

            lspClient.dispose();
            lspClientRef.current = null;
        };
    }, [applyDiagnosticsForUri, ensureProvidersRegistered, functionCatalog.data, refreshSignatureHelp]);

    useEffect(() => {
        const requestRef = signatureHelpRequestRef;
        const frameRef = signatureHelpFrameRef;
        const queuedRef = signatureHelpQueuedRef;
        const inFlightRef = signatureHelpInFlightRef;
        const disposablesRef = editorDisposablesRef;

        return () => {
            requestRef.current++;

            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }

            queuedRef.current = false;
            inFlightRef.current = false;

            disposablesRef.current.forEach((disposable) => disposable.dispose());
            disposablesRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!activeFileId || !activeFileUri) {
            return;
        }

        activeUriRef.current = activeFileUri;

        const fileSwitched = lastActiveFileIdRef.current !== activeFileId;

        if (fileSwitched) {
            lastActiveFileIdRef.current = activeFileId;
            setCompileResult(null);
            setCompileStatus(null);
            setSignatureHelp(null);

            const lspClient = lspClientRef.current;
            const currentFile = activeFileRef.current;

            if (lspClient && currentFile) {
                void lspClient.syncDocument(activeFileUri, currentFile.content);
            }

            refreshSignatureHelp();
        }

        applyDiagnosticsForUri(activeFileUri);
    }, [activeFileId, activeFileUri, applyDiagnosticsForUri, refreshSignatureHelp]);

    const onEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        ensureWynntilsLanguage(monaco);
        ensureProvidersRegistered();

        editorDisposablesRef.current.forEach((disposable) => disposable.dispose());
        editorDisposablesRef.current = [
            editor.onDidChangeCursorPosition(refreshSignatureHelp),
            editor.onDidChangeModelContent(refreshSignatureHelp),
            editor.onDidChangeModel(refreshSignatureHelp),
        ];
        refreshSignatureHelp();

        if (activeUriRef.current) {
            applyDiagnosticsForUri(activeUriRef.current);
        }
    };

    const upsertActiveFileContent = (content: string) => {
        const activeId = activeFile?.id;

        if (!activeId) {
            return;
        }

        if (activeFileRef.current?.id === activeId) {
            activeFileRef.current = {
                ...activeFileRef.current,
                content,
                updatedAt: Date.now(),
            };
        }

        updateActiveFileContent(content);

        const activeUri = activeUriRef.current;
        const lspClient = lspClientRef.current;

        if (activeUri && lspClient) {
            void lspClient.syncDocument(activeUri, content).catch(() => {
                // Best effort sync.
            });
        }
    };

    const compileActiveFile = useCallback(async () => {
        const currentFile = activeFileRef.current;

        if (!currentFile) {
            return;
        }

        setIsCompiling(true);

        try {
            const result = compileSupersetToWynntils(currentFile.content);
            setCompileResult(result);

            if (result.errors.length > 0) {
                setCompileStatus({
                    tone: "warning",
                    message: `Compiled with ${result.errors.length} issue(s).`,
                });
            } else {
                setCompileStatus({ tone: "success", message: "Compiled successfully." });
            }

            window.setTimeout(() => {
                compiledOutputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 0);
        } finally {
            setIsCompiling(false);
        }
    }, []);

    const createFileFromCompiledOutput = () => {
        if (!compileResult || compileResult.code.length === 0) {
            return;
        }

        const sourceFileName = activeFileRef.current?.name;

        if (!sourceFileName) {
            return;
        }

        addFile(createCompiledIdeFileName(sourceFileName), compileResult.code);
    };

    const copyCompiledOutput = useCallback(async () => {
        if (!compileResult || compileResult.code.length === 0) {
            return;
        }

        setIsCopyingCompiledOutput(true);

        try {
            await navigator.clipboard.writeText(compileResult.code);
        } finally {
            window.setTimeout(() => {
                setIsCopyingCompiledOutput(false);
            }, 1200);
        }
    }, [compileResult]);

    const jumpToDiagnostic = (marker: MonacoEditor.IMarkerData) => {
        const editor = editorRef.current;

        if (!editor) {
            return;
        }

        const position = {
            lineNumber: marker.startLineNumber,
            column: marker.startColumn,
        };

        editor.focus();
        editor.setPosition(position);
        editor.revealPositionInCenter(position);
    };

    useEffect(() => {
        const onWindowKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void compileActiveFile();
            }
        };

        window.addEventListener("keydown", onWindowKeyDown);

        return () => {
            window.removeEventListener("keydown", onWindowKeyDown);
        };
    }, [compileActiveFile]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border px-4 py-3">
                <div className="mx-auto flex w-full max-w-[90vw] flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold">
                            <Braces className="size-5" />
                            Wynntils IDE
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Language tooling based on{" "}
                            <a
                                href="https://github.com/DevChromium/wynntils-functions-tools"
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-4"
                            >
                                wynntils-functions-tools
                            </a>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/">Back to docs</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-[92vw] flex-col gap-3 p-4">
                <Card>
                    <CardHeader className="p-3">
                        <IdeToolbar
                            workspace={workspace}
                            activeFileId={activeFileId}
                            importInputRef={fileImportRef}
                            isCompiling={isCompiling}
                            showDiagnostics={showDiagnostics}
                            diagnosticCount={diagnosticMarkers.length}
                            functionCount={lspStatus === "ready" ? (functionCatalog.data?.count ?? 0) : 0}
                            lspStatus={lspStatus}
                            lspError={lspError}
                            onSelectFile={setActiveFileId}
                            onCreate={createNewFile}
                            onRename={renameActiveFile}
                            onDuplicate={duplicateActiveFile}
                            onExport={exportActiveFile}
                            onImport={importFileFromDisk}
                            onDelete={deleteActiveFile}
                            onCompile={() => void compileActiveFile()}
                            onToggleDiagnostics={() => setShowDiagnostics((current) => !current)}
                        />
                    </CardHeader>

                    <CardContent className="px-3 pb-3 pt-0">
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
                            <div className="border border-border bg-[#1e1e1e]">
                                <Editor
                                    height={EDITOR_HEIGHT}
                                    path={activeFileUri ?? undefined}
                                    defaultLanguage={WYNNTILS_LANGUAGE}
                                    language={WYNNTILS_LANGUAGE}
                                    defaultValue={activeFile?.content ?? ""}
                                    onMount={onEditorMount}
                                    onChange={(value) => {
                                        upsertActiveFileContent(value ?? "");
                                        setCompileResult(null);
                                        setCompileStatus(null);
                                    }}
                                    options={EDITOR_OPTIONS}
                                    theme="vs-dark"
                                />
                            </div>

                            <ContextPanel signatureHelp={signatureHelp} />
                        </div>
                    </CardContent>
                </Card>

                {showDiagnostics && diagnosticMarkers.length > 0 ? (
                    <DiagnosticsPanel markers={diagnosticMarkers} onSelect={jumpToDiagnostic} />
                ) : null}

                {compileResult ? (
                    <CompiledOutputPanel
                        result={compileResult}
                        status={compileStatus}
                        isCopying={isCopyingCompiledOutput}
                        containerRef={compiledOutputRef}
                        onCopy={() => void copyCompiledOutput()}
                        onCreateFile={createFileFromCompiledOutput}
                    />
                ) : null}
            </main>
        </div>
    );
}
