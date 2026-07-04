import type { IdeFile } from "@/lib/ide/types";

export function createIdeFile(name: string, content: string): IdeFile {
    return {
        id: crypto.randomUUID(),
        name,
        content,
        updatedAt: Date.now(),
    };
}

export function sanitizeIdeFileName(name: string) {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
        return "untitled.wynntils";
    }

    return trimmed.endsWith(".wynntils") ? trimmed : `${trimmed}.wynntils`;
}

export function createIdeFileUri(fileId: string) {
    return `inmemory://wynntils/${fileId}.wynntils`;
}
