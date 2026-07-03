// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultWorkspace, loadWorkspaceFromStorage, saveWorkspaceToStorage } from "@/lib/ide/storage";

describe("IDE workspace storage", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal("crypto", { randomUUID: () => "test-id" });
    });

    it("creates a usable default workspace", () => {
        const workspace = createDefaultWorkspace();
        expect(workspace.activeFileId).toBe("test-id");
        expect(workspace.files[0].content).toContain("to_background_text");
    });

    it("round-trips a saved workspace", () => {
        const workspace = {
            activeFileId: "one",
            files: [{ id: "one", name: "one.wynntils", content: "{}", updatedAt: 1 }],
        };
        saveWorkspaceToStorage(workspace);
        expect(loadWorkspaceFromStorage()).toEqual(workspace);
    });

    it("falls back safely for malformed or stale active-file data", () => {
        localStorage.setItem("wynntils-ide-workspace:v1", "not json");
        expect(loadWorkspaceFromStorage().files).toHaveLength(1);

        localStorage.setItem(
            "wynntils-ide-workspace:v1",
            JSON.stringify({
                activeFileId: "missing",
                files: [{ id: "one", name: "one.wynntils", content: "{}", updatedAt: 1 }],
            }),
        );
        expect(loadWorkspaceFromStorage().activeFileId).toBe("one");
    });
});
