"use client";

import Editor, { type Monaco as MonacoApi, OnMount } from "@monaco-editor/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import { WYNNTILS_LANGUAGE, ensureWynntilsLanguage, registerWynntilsProviders } from "@/lib/ide/monaco";
import { createDefaultWorkspace, loadWorkspaceFromStorage, saveWorkspaceToStorage } from "@/lib/ide/storage";
import { CompileResult, IdeFile, IdeWorkspace, LspDiagnostic } from "@/lib/ide/types";
import { compileSupersetToWynntils } from "@/lib/ide/upstream-compile";
import {
    AlertTriangle,
    Braces,
    Check,
    FilePlus2,
    FilePenLine,
    FileUp,
    FolderOpenDot,
    Hammer,
    LoaderCircle,
    Save,
    Trash2,
} from "lucide-react";
import type { IDisposable, editor as MonacoEditor } from "monaco-editor";
import Link from "next/link";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const MARKER_OWNER = "wynntils-upstream-lsp";
const WORKSPACE_SAVE_DEBOUNCE_MS = 250;
const DEFAULT_LSP_ENDPOINT = "ws://localhost:3001/wynntils";

function createFile(name: string, content: string): IdeFile {
    return {
        id: crypto.randomUUID(),
        name,
        content,
        updatedAt: Date.now(),
    };
}

function sanitizeFileName(name: string) {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
        return "untitled.wynntils";
    }

    if (trimmed.endsWith(".wynntils")) {
        return trimmed;
    }

    return `${trimmed}.wynntils`;
}

function fileUri(fileId: string) {
    return `inmemory://wynntils/${fileId}.wynntils`;
}

function markerSeverityLabel(severity: number) {
    switch (severity) {
        case 8:
            return "Error";
        case 4:
            return "Warning";
        case 2:
            return "Info";
        case 1:
            return "Hint";
        default:
            return "Info";
    }
}

function markerSeverityVariant(severity: number) {
    switch (severity) {
        case 8:
            return "default" as const;
        case 4:
            return "secondary" as const;
        case 2:
        case 1:
        default:
            return "outline" as const;
    }
}

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
    const lspEndpoint = process.env.NEXT_PUBLIC_WYNNTILS_LSP_WS_URL ?? DEFAULT_LSP_ENDPOINT;

    const [workspace, setWorkspace] = useState<IdeWorkspace>(() => createDefaultWorkspace());
    const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);

    const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
    const [compileStatus, setCompileStatus] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [isCopyingCompiledOutput, setIsCopyingCompiledOutput] = useState(false);

    const [diagnosticMarkers, setDiagnosticMarkers] = useState<MonacoEditor.IMarkerData[]>([]);

    const [lspStatus, setLspStatus] = useState<"connecting" | "ready" | "error">("connecting");
    const [lspError, setLspError] = useState<string | null>(null);

    const fileImportRef = useRef<HTMLInputElement>(null);
    const saveDebounceRef = useRef<number | null>(null);

    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<MonacoApi | null>(null);
    const providerDisposablesRef = useRef<IDisposable[]>([]);

    const lspClientRef = useRef<WynntilsLspClient | null>(null);
    const diagnosticsByUriRef = useRef<Map<string, LspDiagnostic[]>>(new Map());
    const activeUriRef = useRef<string | null>(null);
    const lastActiveFileIdRef = useRef<string | null>(null);

    const activeFile = useMemo(() => {
        return workspace.files.find((file) => file.id === workspace.activeFileId) ?? workspace.files[0] ?? null;
    }, [workspace.activeFileId, workspace.files]);

    const activeFileUri = useMemo(() => {
        return activeFile ? fileUri(activeFile.id) : null;
    }, [activeFile]);

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

    useEffect(() => {
        const loadedWorkspace = loadWorkspaceFromStorage();
        setWorkspace(loadedWorkspace);
        setIsWorkspaceReady(true);
    }, []);

    useEffect(() => {
        if (!isWorkspaceReady) {
            return;
        }

        if (saveDebounceRef.current) {
            window.clearTimeout(saveDebounceRef.current);
        }

        saveDebounceRef.current = window.setTimeout(() => {
            saveWorkspaceToStorage(workspace);
        }, WORKSPACE_SAVE_DEBOUNCE_MS);

        return () => {
            if (saveDebounceRef.current) {
                window.clearTimeout(saveDebounceRef.current);
            }
        };
    }, [isWorkspaceReady, workspace]);

    useEffect(() => {
        const lspClient = new WynntilsLspClient(lspEndpoint);
        lspClientRef.current = lspClient;

        const unsubscribeDiagnostics = lspClient.onDiagnostics((params) => {
            diagnosticsByUriRef.current.set(params.uri, params.diagnostics ?? []);
            applyDiagnosticsForUri(params.uri);
        });

        setLspStatus("connecting");
        setLspError(null);

        void lspClient
            .connect()
            .then(() => {
                setLspStatus("ready");
                ensureProvidersRegistered();
            })
            .catch((error) => {
                setLspStatus("error");
                setLspError(error instanceof Error ? error.message : "Failed to connect to LSP bridge");
            });

        return () => {
            unsubscribeDiagnostics();

            providerDisposablesRef.current.forEach((disposable) => disposable.dispose());
            providerDisposablesRef.current = [];

            lspClient.dispose();
            lspClientRef.current = null;
        };
    }, [applyDiagnosticsForUri, ensureProvidersRegistered, lspEndpoint]);

    useEffect(() => {
        if (!activeFile || !activeFileUri) {
            return;
        }

        activeUriRef.current = activeFileUri;

        const fileSwitched = lastActiveFileIdRef.current !== activeFile.id;

        if (fileSwitched) {
            lastActiveFileIdRef.current = activeFile.id;
            setCompileResult(null);
            setCompileStatus(null);

            const lspClient = lspClientRef.current;
            if (lspClient) {
                void lspClient.syncDocument(activeFileUri, activeFile.content);
            }
        }

        applyDiagnosticsForUri(activeFileUri);
    }, [activeFile, activeFileUri, applyDiagnosticsForUri]);

    const onEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        ensureWynntilsLanguage(monaco);
        ensureProvidersRegistered();

        if (activeUriRef.current) {
            applyDiagnosticsForUri(activeUriRef.current);
        }
    };

    const updateWorkspace = (updater: (previous: IdeWorkspace) => IdeWorkspace) => {
        setWorkspace((previous) => updater(previous));
    };

    const upsertActiveFileContent = (content: string) => {
        const activeId = activeFile?.id;

        if (!activeId) {
            return;
        }

        updateWorkspace((previous) => ({
            ...previous,
            files: previous.files.map((file) =>
                file.id === activeId
                    ? {
                          ...file,
                          content,
                          updatedAt: Date.now(),
                      }
                    : file,
            ),
        }));

        const activeUri = activeUriRef.current;
        const lspClient = lspClientRef.current;

        if (activeUri && lspClient) {
            void lspClient.syncDocument(activeUri, content).catch(() => {
                // Best effort sync.
            });
        }
    };

    const createNewFile = () => {
        const name = window.prompt("File name", "new-function.wynntils");

        if (!name) {
            return;
        }

        const nextFile = createFile(sanitizeFileName(name), "{}");

        updateWorkspace((previous) => ({
            files: [nextFile, ...previous.files],
            activeFileId: nextFile.id,
        }));
    };

    const renameActiveFile = () => {
        if (!activeFile) {
            return;
        }

        const name = window.prompt("Rename file", activeFile.name);

        if (!name) {
            return;
        }

        const nextName = sanitizeFileName(name);

        updateWorkspace((previous) => ({
            ...previous,
            files: previous.files.map((file) =>
                file.id === activeFile.id
                    ? {
                          ...file,
                          name: nextName,
                          updatedAt: Date.now(),
                      }
                    : file,
            ),
        }));
    };

    const duplicateActiveFile = () => {
        if (!activeFile) {
            return;
        }

        const extensionIndex = activeFile.name.lastIndexOf(".");
        const baseName = extensionIndex >= 0 ? activeFile.name.slice(0, extensionIndex) : activeFile.name;
        const nextFile = createFile(`${baseName}-copy.wynntils`, activeFile.content);

        updateWorkspace((previous) => ({
            files: [nextFile, ...previous.files],
            activeFileId: nextFile.id,
        }));
    };

    const deleteActiveFile = () => {
        if (!activeFile || workspace.files.length <= 1) {
            return;
        }

        const shouldDelete = window.confirm(`Delete ${activeFile.name}?`);

        if (!shouldDelete) {
            return;
        }

        const uri = fileUri(activeFile.id);
        const lspClient = lspClientRef.current;
        if (lspClient) {
            void lspClient.closeDocument(uri);
        }

        diagnosticsByUriRef.current.delete(uri);

        updateWorkspace((previous) => {
            const remainingFiles = previous.files.filter((file) => file.id !== activeFile.id);

            return {
                files: remainingFiles,
                activeFileId: remainingFiles[0].id,
            };
        });
    };

    const exportActiveFile = () => {
        if (!activeFile) {
            return;
        }

        const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = href;
        anchor.download = activeFile.name;
        anchor.click();

        URL.revokeObjectURL(href);
    };

    const importFileFromDisk = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const content = await file.text();
        const nextFile = createFile(sanitizeFileName(file.name), content);

        updateWorkspace((previous) => ({
            files: [nextFile, ...previous.files],
            activeFileId: nextFile.id,
        }));

        event.target.value = "";
    };

    const compileActiveFile = useCallback(async () => {
        if (!activeFile) {
            return;
        }

        setIsCompiling(true);

        try {
            const result = compileSupersetToWynntils(activeFile.content);
            setCompileResult(result);

            if (result.errors.length > 0) {
                setCompileStatus({
                    tone: "warning",
                    message: `Compiled with ${result.errors.length} issue(s). Check source diagnostics like VSCode compile command.`,
                });
            } else {
                setCompileStatus({ tone: "success", message: "Compiled successfully." });
            }
        } finally {
            setIsCompiling(false);
        }
    }, [activeFile]);

    const createFileFromCompiledOutput = () => {
        if (!compileResult || compileResult.code.length === 0) {
            return;
        }

        const nextFile = createFile("compiled.wynntils", compileResult.code);

        updateWorkspace((previous) => ({
            files: [nextFile, ...previous.files],
            activeFileId: nextFile.id,
        }));
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
                            Wynntils IDE (Upstream LSP)
                        </h1>
                        {/*<p className="text-xs text-muted-foreground">Monaco + upstream LSP server over WebSocket + local file workspace</p>*/}
                        <p className="text-xs text-muted-foreground">
                            Language tooling by{" "}
                            <a
                                href="https://github.com/DevChromium/wynntils-functions-tools"
                                target="_blank"
                                rel="noreferrer"
                                className="underline underline-offset-4"
                            >
                                DevChromium/wynntils-functions-tools
                            </a>
                            .
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/">Back to docs</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-[90vw] flex-col gap-3 p-4">
                <Card>
                    <CardHeader className="gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={activeFile?.id}
                                onChange={(event) =>
                                    updateWorkspace((previous) => ({
                                        ...previous,
                                        activeFileId: event.target.value,
                                    }))
                                }
                                className="h-9 min-w-72 rounded-md border border-input bg-background px-2 text-sm"
                            >
                                {workspace.files.map((file) => (
                                    <option key={file.id} value={file.id}>
                                        {file.name}
                                    </option>
                                ))}
                            </select>

                            <Button variant="secondary" onClick={createNewFile}>
                                <FilePlus2 className="size-4" />
                                New
                            </Button>
                            <Button variant="outline" onClick={renameActiveFile}>
                                <FilePenLine className="size-4" />
                                Rename
                            </Button>
                            <Button variant="outline" onClick={duplicateActiveFile}>
                                <Save className="size-4" />
                                Duplicate
                            </Button>
                            <Button variant="outline" onClick={exportActiveFile}>
                                <FileUp className="size-4" />
                                Export
                            </Button>
                            <Button variant="outline" onClick={() => fileImportRef.current?.click()}>
                                <FolderOpenDot className="size-4" />
                                Import
                            </Button>
                            <Button
                                variant="outline"
                                onClick={deleteActiveFile}
                                disabled={workspace.files.length <= 1}
                                className="text-red-300"
                            >
                                <Trash2 className="size-4" />
                                Delete
                            </Button>
                            <Button onClick={() => void compileActiveFile()} disabled={isCompiling || !activeFile}>
                                {isCompiling ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Hammer className="size-4" />
                                )}
                                Compile
                            </Button>

                            <input
                                ref={fileImportRef}
                                type="file"
                                accept=".wynntils,.txt"
                                className="hidden"
                                onChange={(event) => {
                                    void importFileFromDisk(event);
                                }}
                            />
                        </div>

                        <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant={lspStatus === "ready" ? "default" : "outline"}>LSP {lspStatus}</Badge>
                            <Badge variant="secondary">{workspace.files.length} files</Badge>
                            <Badge variant="secondary">{diagnosticMarkers.length} diagnostics</Badge>
                            <span>Ctrl/⌘ + Enter compiles when not focused in IDE</span>
                            <span className="ml-auto font-mono">{lspEndpoint}</span>
                            {lspError ? <span className="text-red-300">{lspError}</span> : null}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-hidden rounded-md border border-border">
                            <Editor
                                height="68vh"
                                path={activeFileUri ?? undefined}
                                defaultLanguage={WYNNTILS_LANGUAGE}
                                language={WYNNTILS_LANGUAGE}
                                value={activeFile?.content ?? ""}
                                onMount={onEditorMount}
                                onChange={(value) => {
                                    upsertActiveFileContent(value ?? "");
                                    setCompileResult(null);
                                    setCompileStatus(null);
                                }}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    tabSize: 4,
                                    smoothScrolling: true,
                                    wordWrap: "off",
                                    automaticLayout: true,
                                    bracketPairColorization: { enabled: true },
                                    glyphMargin: true,
                                    renderValidationDecorations: "on",
                                    hover: { enabled: true, delay: 120 },
                                    suggestOnTriggerCharacters: true,
                                    quickSuggestions: {
                                        strings: true,
                                        comments: false,
                                        other: true,
                                    },
                                    scrollBeyondLastLine: false,
                                }}
                                theme="vs-dark"
                            />
                        </div>
                    </CardContent>
                </Card>

                {diagnosticMarkers.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <AlertTriangle className="size-4" />
                                Diagnostics
                            </CardTitle>
                            <CardDescription>
                                Showing {Math.min(diagnosticMarkers.length, 12)} of {diagnosticMarkers.length}{" "}
                                diagnostics.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-2">
                            {diagnosticMarkers.slice(0, 12).map((marker, index) => (
                                <button
                                    key={`${marker.startLineNumber}-${marker.startColumn}-${index}`}
                                    type="button"
                                    onClick={() => jumpToDiagnostic(marker)}
                                    className="flex w-full items-start gap-3 rounded-md border border-border bg-card p-2 text-left hover:bg-accent"
                                >
                                    <Badge variant={markerSeverityVariant(marker.severity)}>
                                        {markerSeverityLabel(marker.severity)}
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted-foreground">
                                            Line {marker.startLineNumber}, Col {marker.startColumn}
                                        </p>
                                        <p className="line-clamp-2 text-sm">{marker.message}</p>
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>
                ) : null}

                {compileStatus ? (
                    <Card
                        className={compileStatus.tone === "success" ? "border-emerald-500/50" : "border-amber-500/50"}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                {compileStatus.tone === "success" ? (
                                    <Check className="size-4" />
                                ) : (
                                    <AlertTriangle className="size-4" />
                                )}
                                Compile status
                            </CardTitle>
                            <CardDescription
                                className={compileStatus.tone === "success" ? "text-emerald-300" : "text-amber-200"}
                            >
                                {compileStatus.message}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                ) : null}

                {compileResult ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Compiled output</CardTitle>
                            <CardDescription>
                                This mirrors the upstream VSCode compile command behavior.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <textarea
                                value={compileResult.code}
                                readOnly
                                spellCheck={false}
                                className="h-40 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs"
                            />

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => void copyCompiledOutput()}
                                    disabled={isCopyingCompiledOutput}
                                >
                                    {isCopyingCompiledOutput ? "Copied" : "Copy output"}
                                </Button>
                                <Button variant="secondary" onClick={createFileFromCompiledOutput}>
                                    Create file from output
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}
            </main>
        </div>
    );
}
