import { expect, test } from "@playwright/test";
import { openIde, readCatalogArtifact, replaceEditorText } from "./fixtures";
import { IDE_STORAGE_KEY } from "@/lib/ide/storage";

const validRegressionCorpus = `Teleport Scrolls: {tp_scroll_charges} {if(eq(tp_scroll_timer; -1); ""; concat("("; str(tp_scroll_timer); ")"))}

{switch(1; "asdf default"; [1, "asdf1", 2, "asdf2"])}

{accessory_durability("Ring_1")}`;

test("real worker publishes exact semantic diagnostics and marker locations", async ({ page }) => {
    await openIde(page, '{accessory_durability("Invalid")}');

    const diagnostics = page.getByRole("button", { name: /diagnostics/ });
    await expect(diagnostics).toContainText("1 diagnostics");
    await diagnostics.click();
    await expect(page.getByText(/must be one of 'Ring_1', 'Ring_2', 'Bracelet', 'Necklace'/)).toBeVisible();
    await expect(page.getByText("Line 1, Col 23")).toBeVisible();
});

test("switch bracket pairs and the multiline regression corpus are valid", async ({ page }) => {
    await openIde(page, `${validRegressionCorpus}\n\n{accessory_durability("Invalid")}`);

    const diagnostics = page.getByRole("button", { name: /diagnostics/ });
    await expect(diagnostics).toContainText("1 diagnostics");

    await replaceEditorText(page, validRegressionCorpus, { verifyExact: true });
    await expect(diagnostics).toContainText("0 diagnostics");
});

test("semantic completions are triggered and ordered before functions", async ({ page }) => {
    await openIde(page, "{}");
    await replaceEditorText(page, "{accessory_durability(");
    await page.keyboard.press("Control+Space");

    const widget = page.locator(".suggest-widget");
    await expect(widget).toBeVisible();
    await expect(widget.locator(".monaco-list-row").first()).toContainText("Ring_1");
    await expect(widget).toContainText("Necklace");
});

test("context, compile output, files, and persistence work end to end", async ({ page }) => {
    const catalog = await readCatalogArtifact();
    const source = 'let color = from_hex("#ffffff");\n\n{accessory_durability("Ring_1")}';
    await openIde(page, "");
    await expect(page.getByText(`${catalog.count} functions`, { exact: true })).toBeVisible();
    await replaceEditorText(page, source, { verifyExact: true });
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/^accessory_durability\(/)).toBeVisible();

    await page.getByRole("button", { name: "Compile" }).click();
    await expect(page.getByText("Compiled successfully.")).toBeVisible();
    await expect(page.locator("textarea[readonly]:not([aria-hidden='true'])")).toHaveValue(
        '{accessory_durability("Ring_1")}',
    );

    await page.getByRole("button", { name: "Create file from output" }).click();
    await expect(page.locator("select option:checked")).toHaveText("e2e-compiled.wynntils");

    page.once("dialog", (dialog) => dialog.accept("second"));
    await page.getByRole("button", { name: "New", exact: true }).click();
    await expect(page.locator("select")).toHaveValue(/.+/);
    await expect(page.locator("select option:checked")).toHaveText("second.wynntils");
    await page.waitForFunction((storageKey) => {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return false;
        const workspace = JSON.parse(raw) as { files: Array<{ name: string }>; activeFileId: string };
        return workspace.files.length === 3 && workspace.files.some((file) => file.name === "second.wynntils");
    }, IDE_STORAGE_KEY);

    await page.reload();
    await expect(page.locator("select option:checked")).toHaveText("second.wynntils");
    await expect(page.getByText(`${catalog.count} functions`, { exact: true })).toBeVisible();
});
