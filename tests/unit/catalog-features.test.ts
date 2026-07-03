import { describe, expect, it } from "vitest";
import { createCatalogFromResponse } from "@/lib/ide/browser-lsp/catalog";
import { createFunctionCompletionItems } from "@/lib/ide/browser-lsp/completions";
import { createHoverForPosition } from "@/lib/ide/browser-lsp/hover";
import { createSignatureHelp } from "@/lib/ide/browser-lsp/signature-help";
import { createTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

describe("completion, hover, and signature features", () => {
    const catalog = createCatalogFromResponse(createRepresentativeCatalog());

    it("creates canonical and alias completion items and ranks compatible returns first", () => {
        const items = createFunctionCompletionItems(catalog, { expectedType: "CappedValue" });
        const accessory = items.find((item) => item.label === "accessory_durability")!;
        const switchAlias = items.find((item) => item.label === "switch")!;

        expect(accessory.sortText?.startsWith("0_")).toBe(true);
        expect(accessory.insertText).toContain("accessory_durability(${1:accessory})");
        expect(switchAlias.detail).toContain("switch_case");
    });

    it("returns markdown hover details for aliases", () => {
        const document = createTextDocument("test://hover", "{switch(1; 2; [1, 2])}");
        const hover = createHoverForPosition(document, { line: 0, character: 3 }, catalog);

        expect(hover?.contents).toMatchObject({ kind: "markdown" });
        expect((hover?.contents as { value: string }).value).toContain("**switch_case**");
        expect((hover?.contents as { value: string }).value).toContain("**Aliases:** switch");
    });

    it("returns active nested signature and parameter", () => {
        const source = "{if(true; accessory_durability(\"Ring_1\"); false)}";
        const document = createTextDocument("test://signature", source);
        const signature = createSignatureHelp(document, document.positionAt(source.indexOf("Ring_1") + 3), catalog);

        expect(signature?.signatures[signature.activeSignature].label).toContain("accessory_durability");
        expect(signature?.activeParameter).toBe(0);
    });
});
