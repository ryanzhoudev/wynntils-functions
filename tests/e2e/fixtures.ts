import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FunctionCatalogResponse } from "@/lib/types";
import { IDE_STORAGE_KEY } from "@/lib/ide/storage";

const catalogPath = path.resolve(process.env.WYNNTILS_CATALOG_ARTIFACT ?? ".test-artifacts/function-catalog.json");

export async function readCatalogArtifact(): Promise<FunctionCatalogResponse> {
    return JSON.parse(await readFile(catalogPath, "utf8")) as FunctionCatalogResponse;
}

export async function mockCatalog(page: Page, catalog?: FunctionCatalogResponse) {
    const response = catalog ?? (await readCatalogArtifact());
    await page.route("**/api/functions", async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
    });
}

export async function seedIdeWorkspace(page: Page, source: string, name = "e2e.wynntils") {
    await page.addInitScript(
        ({ content, fileName, storageKey }) => {
            if (!window.localStorage.getItem(storageKey)) {
                window.localStorage.setItem(
                    storageKey,
                    JSON.stringify({
                        files: [{ id: "e2e-file", name: fileName, content, updatedAt: Date.now() }],
                        activeFileId: "e2e-file",
                    }),
                );
            }
        },
        { content: source, fileName: name, storageKey: IDE_STORAGE_KEY },
    );
}

export async function openIde(page: Page, source: string) {
    await mockCatalog(page);
    await seedIdeWorkspace(page, source);
    await page.goto("/ide");
    await expect(page.locator('[title="browser worker ready"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".monaco-editor")).toBeVisible();
}

export async function replaceEditorText(page: Page, source: string) {
    const input = page.getByRole("textbox", { name: "Editor content" });
    await input.focus();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.insertText(source);
}
