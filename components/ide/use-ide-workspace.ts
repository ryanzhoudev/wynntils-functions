"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { loadWorkspaceFromStorage, saveWorkspaceToStorage } from "@/lib/ide/storage";
import type { IdeFile, IdeWorkspace } from "@/lib/ide/types";
import { createIdeFile, sanitizeIdeFileName } from "@/lib/ide/workspace";

const WORKSPACE_SAVE_DEBOUNCE_MS = 250;

export function useIdeWorkspace(onBeforeDelete: (file: IdeFile) => void) {
    const [workspace, setWorkspace] = useState<IdeWorkspace>(() => loadWorkspaceFromStorage());
    const saveDebounceRef = useRef<number | null>(null);
    const activeFile = useMemo(
        () => workspace.files.find((file) => file.id === workspace.activeFileId) ?? workspace.files[0] ?? null,
        [workspace.activeFileId, workspace.files],
    );

    useEffect(() => {
        if (saveDebounceRef.current) {
            window.clearTimeout(saveDebounceRef.current);
        }

        saveDebounceRef.current = window.setTimeout(
            () => saveWorkspaceToStorage(workspace),
            WORKSPACE_SAVE_DEBOUNCE_MS,
        );

        return () => {
            if (saveDebounceRef.current) {
                window.clearTimeout(saveDebounceRef.current);
            }
        };
    }, [workspace]);

    function addFile(name: string, content: string) {
        const nextFile = createIdeFile(sanitizeIdeFileName(name), content);
        setWorkspace((previous) => ({ files: [nextFile, ...previous.files], activeFileId: nextFile.id }));
    }

    function createNewFile() {
        const name = window.prompt("File name", "new-function.wynntils");
        if (name) addFile(name, "{}");
    }

    function renameActiveFile() {
        if (!activeFile) return;
        const name = window.prompt("Rename file", activeFile.name);
        if (!name) return;
        const nextName = sanitizeIdeFileName(name);

        setWorkspace((previous) => ({
            ...previous,
            files: previous.files.map((file) =>
                file.id === activeFile.id ? { ...file, name: nextName, updatedAt: Date.now() } : file,
            ),
        }));
    }

    function duplicateActiveFile() {
        if (!activeFile) return;
        const extensionIndex = activeFile.name.lastIndexOf(".");
        const baseName = extensionIndex >= 0 ? activeFile.name.slice(0, extensionIndex) : activeFile.name;
        addFile(`${baseName}-copy.wynntils`, activeFile.content);
    }

    function deleteActiveFile() {
        if (!activeFile || workspace.files.length <= 1 || !window.confirm(`Delete ${activeFile.name}?`)) return;
        onBeforeDelete(activeFile);
        setWorkspace((previous) => {
            const files = previous.files.filter((file) => file.id !== activeFile.id);
            return { files, activeFileId: files[0].id };
        });
    }

    function exportActiveFile() {
        if (!activeFile) return;
        const href = URL.createObjectURL(new Blob([activeFile.content], { type: "text/plain;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = activeFile.name;
        anchor.click();
        URL.revokeObjectURL(href);
    }

    async function importFileFromDisk(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        addFile(file.name, await file.text());
        event.target.value = "";
    }

    function updateActiveFileContent(content: string) {
        if (!activeFile) return;
        const updatedAt = Date.now();
        setWorkspace((previous) => ({
            ...previous,
            files: previous.files.map((file) => (file.id === activeFile.id ? { ...file, content, updatedAt } : file)),
        }));
    }

    return {
        workspace,
        activeFile,
        setActiveFileId(activeFileId: string) {
            setWorkspace((previous) => ({ ...previous, activeFileId }));
        },
        addFile,
        createNewFile,
        renameActiveFile,
        duplicateActiveFile,
        deleteActiveFile,
        exportActiveFile,
        importFileFromDisk,
        updateActiveFileContent,
    };
}
