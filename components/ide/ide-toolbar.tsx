import { AlertTriangle, Copy, FilePenLine, FilePlus2, FileUp, Hammer, LoaderCircle, Save, Trash2 } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IdeWorkspace } from "@/lib/ide/types";

export type LspStatus = "connecting" | "ready" | "error";

function workerStatusDotClass(status: LspStatus) {
    switch (status) {
        case "ready":
            return "bg-emerald-400";
        case "error":
            return "bg-red-400";
        default:
            return "bg-amber-300";
    }
}

export function IdeToolbar({
    workspace,
    activeFileId,
    fileSelectFlashKey,
    importInputRef,
    isCompiling,
    showDiagnostics,
    diagnosticCount,
    functionCount,
    lspStatus,
    lspError,
    onSelectFile,
    onCreate,
    onRename,
    onDuplicate,
    onExport,
    onImport,
    onDelete,
    onCompile,
    onToggleDiagnostics,
}: {
    workspace: IdeWorkspace;
    activeFileId: string | null;
    fileSelectFlashKey: number;
    importInputRef: RefObject<HTMLInputElement | null>;
    isCompiling: boolean;
    showDiagnostics: boolean;
    diagnosticCount: number;
    functionCount: number;
    lspStatus: LspStatus;
    lspError: string | null;
    onSelectFile(id: string): void;
    onCreate(): void;
    onRename(): void;
    onDuplicate(): void;
    onExport(): void;
    onImport(event: ChangeEvent<HTMLInputElement>): void | Promise<void>;
    onDelete(): void;
    onCompile(): void;
    onToggleDiagnostics(): void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <select
                key={fileSelectFlashKey}
                value={activeFileId ?? ""}
                onChange={(event) => onSelectFile(event.target.value)}
                className={`h-9 min-w-72 rounded-md border border-input bg-background px-2 text-sm ${
                    fileSelectFlashKey > 0
                        ? "animate-[ide-file-select-flash_900ms_ease-out] motion-reduce:animate-none"
                        : ""
                }`}
            >
                {workspace.files.map((file) => (
                    <option key={file.id} value={file.id}>
                        {file.name}
                    </option>
                ))}
            </select>

            <Button variant="secondary" onClick={onCreate}>
                <FilePlus2 className="size-4" /> New
            </Button>
            <Button variant="outline" onClick={onRename}>
                <FilePenLine className="size-4" /> Rename
            </Button>
            <Button variant="outline" onClick={onDuplicate}>
                <Copy className="size-4" /> Duplicate
            </Button>
            <Button variant="outline" onClick={onExport}>
                <Save className="size-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
                <FileUp className="size-4" /> Import
            </Button>
            <span title={workspace.files.length <= 1 ? "You can't delete the last file" : undefined}>
                <Button
                    variant="outline"
                    onClick={onDelete}
                    disabled={workspace.files.length <= 1}
                    className="text-red-300"
                >
                    <Trash2 className="size-4" /> Delete
                </Button>
            </span>
            <Button onClick={onCompile} disabled={isCompiling || !activeFileId} title="Shortcut: Ctrl/⌘ + Enter">
                {isCompiling ? <LoaderCircle className="size-4 animate-spin" /> : <Hammer className="size-4" />}
                Compile
            </Button>

            <input
                ref={importInputRef}
                type="file"
                accept=".wynntils,.txt"
                className="hidden"
                onChange={(event) => void onImport(event)}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" title="Functions loaded into the browser LSP">
                    {functionCount} functions
                </Badge>
                <Button
                    variant={showDiagnostics ? "secondary" : "outline"}
                    size="sm"
                    onClick={onToggleDiagnostics}
                    disabled={diagnosticCount === 0}
                    aria-pressed={showDiagnostics}
                >
                    <AlertTriangle className="size-4" />
                    {diagnosticCount} diagnostics
                </Button>
                <span
                    className="inline-flex max-w-48 items-center gap-1.5 truncate font-mono"
                    title={lspError ?? `browser worker ${lspStatus}`}
                >
                    <span
                        className={`size-2 shrink-0 rounded-full ${workerStatusDotClass(lspStatus)}`}
                        aria-hidden="true"
                    />
                    <span className="truncate">browser worker</span>
                </span>
            </div>
        </div>
    );
}
