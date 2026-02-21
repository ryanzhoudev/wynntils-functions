"use client";

import Editor, { type Monaco as MonacoApi, OnMount } from "@monaco-editor/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toFunctionMetadata } from "@/lib/ide/metadata";
import { WYNNTILS_LANGUAGE, ensureWynntilsLanguage, registerWynntilsProviders } from "@/lib/ide/monaco";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import { createDefaultWorkspace, loadWorkspaceFromStorage, saveWorkspaceToStorage } from "@/lib/ide/storage";
import { CompileResult, IdeFile, IdeWorkspace, LspDiagnostic } from "@/lib/ide/types";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { AlertTriangle, Braces, FilePlus2, FilePenLine, FileUp, FolderOpenDot, Hammer, LoaderCircle, Save, Trash2 } from "lucide-react";
import type { IDisposable, editor as MonacoEditor } from "monaco-editor";
import Link from "next/link";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const MARKER_OWNER = "wynntils-lsp";
const MONACO_ERROR_SEVERITY = 8;
const WORKSPACE_SAVE_DEBOUNCE_MS = 250;

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

function mapDiagnosticSeverity(monaco: MonacoApi, severity: LspDiagnostic["severity"]) {
    switch (severity) {
        case "error":
            return monaco.MarkerSeverity.Error;
        case "warning":
            return monaco.MarkerSeverity.Warning;
        case "information":
            return monaco.MarkerSeverity.Info;
        case "hint":
            return monaco.MarkerSeverity.Hint;
        default:
            return monaco.MarkerSeverity.Info;
    }
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

export default function WynntilsIde() {
    const { data, isLoading: isCatalogLoading, error: catalogError, refresh: refreshCatalog } = useFunctionCatalog();

    const [workspace, setWorkspace] = useState<IdeWorkspace>(() => createDefaultWorkspace());
    const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
    const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [isCopyingCompiledOutput, setIsCopyingCompiledOutput] = useState(false);
    const [compileStatus, setCompileStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
    const [diagnosticCount, setDiagnosticCount] = useState(0);
    const [diagnosticMarkers, setDiagnosticMarkers] = useState<MonacoEditor.IMarkerData[]>([]);
    const [isCatalogAttached, setIsCatalogAttached] = useState(false);

    const fileImportRef = useRef<HTMLInputElement>(null);
    const saveDebounceRef = useRef<number | null>(null);
    const diagnosticsDebounceRef = useRef<number | null>(null);

    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<MonacoApi | null>(null);
    const providerDisposablesRef = useRef<IDisposable[]>([]);
    const lspClientRef = useRef<WynntilsLspClient | null>(null);

    const activeFile = useMemo(() => {
        return workspace.files.find((file) => file.id === workspace.activeFileId) ?? workspace.files[0] ?? null;
    }, [workspace.activeFileId, workspace.files]);

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
        const client = new WynntilsLspClient();
        lspClientRef.current = client;

        return () => {
            client.dispose();
            lspClientRef.current = null;
        };
    }, []);

    useEffect(() => {
        const monaco = monacoRef.current;
        const lspClient = lspClientRef.current;

        if (!monaco || !lspClient) {
            return;
        }

        if (providerDisposablesRef.current.length > 0) {
            return;
        }

        providerDisposablesRef.current = registerWynntilsProviders(monaco, lspClient);

        return () => {
            for (const disposable of providerDisposablesRef.current) {
                disposable.dispose();
            }
            providerDisposablesRef.current = [];
        };
    }, []);

    useEffect(() => {
        const lspClient = lspClientRef.current;

        if (!lspClient || !data?.functions) {
            return;
        }

        const metadata = toFunctionMetadata(data.functions);

        void lspClient
            .setCatalog(metadata)
            .then(() => setIsCatalogAttached(true))
            .catch(() => setIsCatalogAttached(false));
    }, [data?.functions]);


    const runDiagnostics = useCallback(async () => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const lspClient = lspClientRef.current;

        if (!editor || !monaco || !lspClient) {
            return [] as MonacoEditor.IMarkerData[];
        }

        const model = editor.getModel();

        if (!model) {
            return [] as MonacoEditor.IMarkerData[];
        }

        const version = model.getVersionId();
        const diagnostics = await lspClient.getDiagnostics(model.getValue());

        if (model.isDisposed() || model.getVersionId() !== version) {
            return [] as MonacoEditor.IMarkerData[];
        }

        const markers: MonacoEditor.IMarkerData[] = diagnostics.map((diagnostic) => {
            const start = model.getPositionAt(diagnostic.startOffset);
            const end = model.getPositionAt(diagnostic.endOffset);

            return {
                severity: mapDiagnosticSeverity(monaco, diagnostic.severity),
                message: diagnostic.message,
                source: "wynntils",
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
            };
        });

        monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
        setDiagnosticCount(markers.length);
        setDiagnosticMarkers(markers);

        return markers;
    }, []);

    const scheduleDiagnostics = useCallback(() => {
        if (diagnosticsDebounceRef.current) {
            window.clearTimeout(diagnosticsDebounceRef.current);
        }

        diagnosticsDebounceRef.current = window.setTimeout(() => {
            void runDiagnostics();
        }, 120);
    }, [runDiagnostics]);

    useEffect(() => {
        if (!isCatalogAttached) {
            return;
        }

        scheduleDiagnostics();
    }, [isCatalogAttached, scheduleDiagnostics]);

    const onEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        ensureWynntilsLanguage(monaco);
        scheduleDiagnostics();
    };

    useEffect(() => {
        return () => {
            if (diagnosticsDebounceRef.current) {
                window.clearTimeout(diagnosticsDebounceRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!workspace.activeFileId) {
            return;
        }

        setCompileResult(null);
        setCompileStatus(null);
        scheduleDiagnostics();
    }, [workspace.activeFileId, scheduleDiagnostics]);

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
        if (!activeFile || !lspClientRef.current) {
            return;
        }

        setIsCompiling(true);
        setCompileStatus(null);

        try {
            const baseMarkers = await runDiagnostics();
            const errorCount = baseMarkers.filter((marker) => marker.severity === MONACO_ERROR_SEVERITY).length;

            if (errorCount > 0) {
                setCompileResult(null);
                setCompileStatus({
                    tone: "error",
                    message: `Compilation blocked: fix ${errorCount} error${errorCount === 1 ? "" : "s"} first.`,
                });
                return;
            }

            const result = await lspClientRef.current.compile(activeFile.content);

            if (result.errors.length > 0) {
                const monaco = monacoRef.current;
                const editor = editorRef.current;
                const model = editor?.getModel();

                if (monaco && model) {
                    const compileMarkers: MonacoEditor.IMarkerData[] = result.errors.map((error) => {
                        const start = model.getPositionAt(error.off);
                        const end = model.getPositionAt(error.off + 1);

                        return {
                            severity: monaco.MarkerSeverity.Error,
                            source: "compiler",
                            message: error.msg,
                            startLineNumber: start.lineNumber,
                            startColumn: start.column,
                            endLineNumber: end.lineNumber,
                            endColumn: end.column,
                        };
                    });

                    const mergedMarkers = [...baseMarkers, ...compileMarkers];
                    monaco.editor.setModelMarkers(model, MARKER_OWNER, mergedMarkers);
                    setDiagnosticCount(mergedMarkers.length);
                    setDiagnosticMarkers(mergedMarkers);
                }

                setCompileResult(null);
                setCompileStatus({
                    tone: "error",
                    message: `Compilation failed with ${result.errors.length} compiler error${result.errors.length === 1 ? "" : "s"}.`,
                });
                return;
            }

            setCompileResult(result);
            setCompileStatus({ tone: "success", message: "Compilation succeeded." });
        } finally {
            setIsCompiling(false);
        }
    }, [activeFile, runDiagnostics]);

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
                <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-semibold">
                            <Braces className="size-5" />
                            Wynntils IDE
                        </h1>
                        <p className="text-xs text-muted-foreground">Monaco + browser LSP worker + local file workspace</p>
                        <p className="text-xs text-muted-foreground">
                            Language tooling adapted from{" "}
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
                        <Button variant="outline" onClick={() => refreshCatalog()}>
                            <FolderOpenDot className="size-4" />
                            Refresh catalog
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 p-4">
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
                                {isCompiling ? <LoaderCircle className="size-4 animate-spin" /> : <Hammer className="size-4" />}
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
                            <Badge variant={isCatalogAttached ? "default" : "outline"}>
                                Catalog {isCatalogAttached ? "ready" : isCatalogLoading ? "loading" : "not ready"}
                            </Badge>
                            <Badge variant="secondary">{workspace.files.length} files</Badge>
                            <Badge variant="secondary">{diagnosticCount} diagnostics</Badge>
                            <span>Shortcut: Ctrl/⌘ + Enter to compile</span>
                            {catalogError ? <span className="text-red-300">{catalogError}</span> : null}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-hidden rounded-md border border-border">
                            <Editor
                                height="68vh"
                                defaultLanguage={WYNNTILS_LANGUAGE}
                                language={WYNNTILS_LANGUAGE}
                                value={activeFile?.content ?? ""}
                                onMount={onEditorMount}
                                onChange={(value) => {
                                    upsertActiveFileContent(value ?? "");
                                    setCompileStatus(null);
                                    scheduleDiagnostics();
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
                                Showing {Math.min(diagnosticMarkers.length, 12)} of {diagnosticMarkers.length} diagnostics.
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
                    <Card className={compileStatus.tone === "error" ? "border-red-500/50" : "border-emerald-500/50"}>
                        <CardHeader>
                            <CardTitle className="text-base">Compile status</CardTitle>
                            <CardDescription
                                className={compileStatus.tone === "error" ? "text-red-300" : "text-emerald-300"}
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
                            <CardDescription>Compiled successfully and normalized for inline use.</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">

                            <textarea
                                value={compileResult.code}
                                readOnly
                                spellCheck={false}
                                className="h-40 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs"
                            />

                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => void copyCompiledOutput()} disabled={isCopyingCompiledOutput}>
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
