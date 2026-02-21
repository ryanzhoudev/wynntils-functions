"use client";

import Editor, { type Monaco as MonacoApi, OnMount } from "@monaco-editor/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toFunctionMetadata } from "@/lib/ide/metadata";
import { WYNNTILS_LANGUAGE, ensureWynntilsLanguage, registerWynntilsProviders } from "@/lib/ide/monaco";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import { createDefaultWorkspace, loadWorkspaceFromStorage, saveWorkspaceToStorage } from "@/lib/ide/storage";
import { CompileResult, IdeFile, IdeWorkspace, LspDiagnostic } from "@/lib/ide/types";
import { useFunctionCatalog } from "@/lib/use-function-catalog";
import { Braces, FilePlus2, FilePenLine, FileUp, FolderOpenDot, Hammer, LoaderCircle, Save, Trash2 } from "lucide-react";
import type { IDisposable, editor as MonacoEditor } from "monaco-editor";
import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

const MARKER_OWNER = "wynntils-lsp";
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

export default function WynntilsIde() {
    const { data, isLoading: isCatalogLoading, error: catalogError, refresh: refreshCatalog } = useFunctionCatalog();

    const [workspace, setWorkspace] = useState<IdeWorkspace>(() => createDefaultWorkspace());
    const [isWorkspaceReady, setIsWorkspaceReady] = useState(false);
    const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
    const [isCompiling, setIsCompiling] = useState(false);
    const [diagnosticCount, setDiagnosticCount] = useState(0);
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

    const runDiagnostics = async () => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const lspClient = lspClientRef.current;

        if (!editor || !monaco || !lspClient) {
            return;
        }

        const model = editor.getModel();

        if (!model) {
            return;
        }

        const version = model.getVersionId();
        const diagnostics = await lspClient.getDiagnostics(model.getValue());

        if (model.isDisposed() || model.getVersionId() !== version) {
            return;
        }

        const markers: MonacoEditor.IMarkerData[] = diagnostics.map((diagnostic) => {
            const start = model.getPositionAt(diagnostic.startOffset);
            const end = model.getPositionAt(diagnostic.endOffset);

            return {
                severity: mapDiagnosticSeverity(monaco, diagnostic.severity),
                message: diagnostic.message,
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: end.lineNumber,
                endColumn: end.column,
            };
        });

        monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
        setDiagnosticCount(markers.length);
    };

    const scheduleDiagnostics = () => {
        if (diagnosticsDebounceRef.current) {
            window.clearTimeout(diagnosticsDebounceRef.current);
        }

        diagnosticsDebounceRef.current = window.setTimeout(() => {
            void runDiagnostics();
        }, 120);
    };

    const onEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        ensureWynntilsLanguage(monaco);
        scheduleDiagnostics();
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

    const compileActiveFile = async () => {
        if (!activeFile || !lspClientRef.current) {
            return;
        }

        setIsCompiling(true);
        try {
            const result = await lspClientRef.current.compile(activeFile.content);
            setCompileResult(result);
        } finally {
            setIsCompiling(false);
        }
    };

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

    const copyCompiledOutput = async () => {
        if (!compileResult || compileResult.code.length === 0) {
            return;
        }

        await navigator.clipboard.writeText(compileResult.code);
    };

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
                            <Button onClick={() => compileActiveFile()} disabled={isCompiling}>
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
                                    scrollBeyondLastLine: false,
                                }}
                                theme="vs-dark"
                            />
                        </div>
                    </CardContent>
                </Card>

                {compileResult ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Compiled output</CardTitle>
                            <CardDescription>
                                {compileResult.errors.length > 0
                                    ? `Compiled with ${compileResult.errors.length} issue(s).`
                                    : "Compiled successfully."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {compileResult.errors.length > 0 ? (
                                <div className="space-y-1 text-sm text-amber-200">
                                    {compileResult.errors.map((error, index) => (
                                        <p key={`${error.off}-${index}`}>
                                            • {error.msg} (offset {error.off})
                                        </p>
                                    ))}
                                </div>
                            ) : null}

                            <Input value={compileResult.code} readOnly />

                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => void copyCompiledOutput()}>
                                    Copy output
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
