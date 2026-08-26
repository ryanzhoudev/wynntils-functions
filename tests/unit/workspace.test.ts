import { describe, expect, it } from "vitest";
import { createCompiledIdeFileName } from "@/lib/ide/workspace";

describe("IDE workspace file names", () => {
    it.each([
        ["example.wynntils", "example-compiled.wynntils"],
        ["example", "example-compiled.wynntils"],
        ["example.source.wynntils", "example.source-compiled.wynntils"],
    ])("derives a compiled file name from %s", (sourceName, expectedName) => {
        expect(createCompiledIdeFileName(sourceName)).toBe(expectedName);
    });
});
