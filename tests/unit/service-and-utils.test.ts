import { describe, expect, it } from "vitest";
import { WynntilsBrowserLspService } from "@/lib/ide/browser-lsp/service";
import { compileSupersetToWynntils } from "@/lib/ide/upstream-compile";
import { DEFAULT_SEARCH_SCOPE, createSearchBlob, matchesQuery, normalizeQueryTokens } from "@/lib/search";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

describe("browser LSP service", () => {
    it("publishes diagnostics and clears them when a document closes", async () => {
        const service = new WynntilsBrowserLspService(createRepresentativeCatalog());
        const events: Array<{ diagnostics: unknown[] }> = [];
        service.onDiagnostics((params) => events.push(params));

        await service.syncDocument("test://service", '{accessory_durability("INVALID")}');
        expect(events.at(-1)?.diagnostics).toHaveLength(1);

        await service.closeDocument("test://service");
        expect(events.at(-1)?.diagnostics).toEqual([]);
        service.dispose();
    });

    it("serves semantic completions, hover, and signature help", async () => {
        const service = new WynntilsBrowserLspService(createRepresentativeCatalog());
        const uri = "test://features";
        const source = "{accessory_durability(";
        await service.syncDocument(uri, source);

        const completions = await service.requestCompletion(uri, { line: 0, character: source.length }, "(");
        expect(completions.slice(0, 4).map((item) => item.label)).toEqual(["Ring_1", "Ring_2", "Bracelet", "Necklace"]);

        await service.syncDocument(uri, '{accessory_durability("Ring_1")}');
        expect((await service.requestHover(uri, { line: 0, character: 4 }))?.contents).toBeTruthy();
        expect((await service.requestSignatureHelp(uri, { line: 0, character: 28 }))?.signatures[0].label).toContain(
            "accessory_durability",
        );
        service.dispose();
    });

    it("revalidates open documents after catalog updates", async () => {
        const emptyCatalog = { functions: [], count: 0, dataVersion: "empty", harvestedAt: 0 };
        const service = new WynntilsBrowserLspService(emptyCatalog);
        const messages: string[][] = [];
        service.onDiagnostics((params) => messages.push(params.diagnostics.map((diagnostic) => diagnostic.message)));
        await service.syncDocument("test://update", '{accessory_durability("Ring_1")}');
        expect(messages.at(-1)).toContain("Unknown function 'accessory_durability'");

        service.updateCatalog(createRepresentativeCatalog());
        expect(messages.at(-1)).toEqual([]);
        service.dispose();
    });
});

describe("compiler and search utilities", () => {
    it("resolves variables, strips raw prefixes, and removes declaration lines", () => {
        const result = compileSupersetToWynntils('let value = r"hello";\n{styled_text(@{value})}');
        expect(result).toEqual({ code: '{styled_text("hello")}', errors: [] });
    });

    it("reports duplicate, undefined, and circular variables", () => {
        const result = compileSupersetToWynntils("let a = @{b}; let b = @{a}; let a = 1; @{missing}");
        expect(result.errors.map((error) => error.msg)).toEqual(
            expect.arrayContaining([
                "Duplicate variable 'a'",
                "Circular variable reference involving 'a'",
                "Undefined variable 'missing'",
            ]),
        );
    });

    it("normalizes multi-token searches against selected fields", () => {
        const entry = createRepresentativeCatalog().functions.find((fn) => fn.name === "accessory_durability")!;
        expect(normalizeQueryTokens("  ACCESSORY   capped ")).toEqual(["accessory", "capped"]);
        expect(createSearchBlob(entry, DEFAULT_SEARCH_SCOPE)).toContain("durability");
        expect(matchesQuery(entry, DEFAULT_SEARCH_SCOPE, ["accessory", "durability"])).toBe(true);
        expect(matchesQuery(entry, DEFAULT_SEARCH_SCOPE, ["customcolor"])).toBe(false);
    });
});
