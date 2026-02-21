import { IdeFile, IdeWorkspace } from "@/lib/ide/types";

const IDE_STORAGE_KEY = "wynntils-ide-workspace:v1";

const DEFAULT_FILE_NAME = "new-function.wynntils";
const DEFAULT_FILE_CONTENT = `let textColor = from_hex("#ffffff");
let bgColor = from_hex("#00ff00");
let edge = "PILL";

{to_background_text("Hello Wynntils!"; @{textColor}; @{bgColor}; @{edge}; @{edge})}`;

function createDefaultFile(): IdeFile {
    return {
        id: crypto.randomUUID(),
        name: DEFAULT_FILE_NAME,
        content: DEFAULT_FILE_CONTENT,
        updatedAt: Date.now(),
    };
}

export function createDefaultWorkspace(): IdeWorkspace {
    const defaultFile = createDefaultFile();

    return {
        files: [defaultFile],
        activeFileId: defaultFile.id,
    };
}

function isIdeFile(value: unknown): value is IdeFile {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as IdeFile;

    return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.content === "string" &&
        typeof candidate.updatedAt === "number"
    );
}

function isWorkspace(value: unknown): value is IdeWorkspace {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const candidate = value as IdeWorkspace;

    return (
        Array.isArray(candidate.files) &&
        candidate.files.every((file) => isIdeFile(file)) &&
        typeof candidate.activeFileId === "string"
    );
}

export function loadWorkspaceFromStorage(): IdeWorkspace {
    if (typeof window === "undefined") {
        return createDefaultWorkspace();
    }

    const raw = window.localStorage.getItem(IDE_STORAGE_KEY);

    if (!raw) {
        return createDefaultWorkspace();
    }

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (!isWorkspace(parsed) || parsed.files.length === 0) {
            return createDefaultWorkspace();
        }

        const activeFileExists = parsed.files.some((file) => file.id === parsed.activeFileId);

        return {
            files: parsed.files,
            activeFileId: activeFileExists ? parsed.activeFileId : parsed.files[0].id,
        };
    } catch {
        return createDefaultWorkspace();
    }
}

export function saveWorkspaceToStorage(workspace: IdeWorkspace) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(IDE_STORAGE_KEY, JSON.stringify(workspace));
    } catch {
        // Ignore localStorage failures.
    }
}
