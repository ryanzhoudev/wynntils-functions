import { describe, expect, it } from "vitest";
import { isFunctionCatalogResponse, validateFunctionCatalogResponse } from "@/lib/function-catalog-validation";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

describe("function catalog payload validation", () => {
    it("accepts a valid catalog", () => {
        const catalog = createRepresentativeCatalog();
        expect(validateFunctionCatalogResponse(catalog)).toEqual([]);
        expect(isFunctionCatalogResponse(catalog)).toBe(true);
    });

    it("reports shape and count errors", () => {
        const catalog = createRepresentativeCatalog();
        catalog.count++;
        catalog.functions[0].arguments[0].required = "yes" as unknown as boolean;
        const errors = validateFunctionCatalogResponse(catalog);

        expect(errors).toContain("Catalog count 6 does not match functions length 5.");
        expect(errors.some((error) => error.includes("invalid shape"))).toBe(true);
        expect(isFunctionCatalogResponse(null)).toBe(false);
    });

    it("reports canonical-name and alias collisions", () => {
        const catalog = createRepresentativeCatalog();
        catalog.functions[0].aliases.push(catalog.functions[1].name);

        expect(validateFunctionCatalogResponse(catalog)).toContain(
            `Function lookup name '${catalog.functions[1].name}' is shared by '${catalog.functions[0].name}' and '${catalog.functions[1].name}'.`,
        );
    });
});
