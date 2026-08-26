import type { IdeFile } from "@/lib/ide/types";

const WYNNTILS_FILE_EXTENSION = ".wynntils";

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

    return trimmed.endsWith(WYNNTILS_FILE_EXTENSION) ? trimmed : `${trimmed}${WYNNTILS_FILE_EXTENSION}`;
}

export function createCompiledIdeFileName(name: string) {
    const sanitizedName = sanitizeIdeFileName(name);
    const baseName = sanitizedName.slice(0, -WYNNTILS_FILE_EXTENSION.length);

    return `${baseName}-compiled${WYNNTILS_FILE_EXTENSION}`;
}

export function createIdeFileUri(fileId: string) {
    return `inmemory://wynntils/${fileId}.wynntils`;
}
