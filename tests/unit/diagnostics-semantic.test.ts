import { describe, expect, it } from "vitest";
import { createCatalogFromResponse } from "@/lib/ide/browser-lsp/catalog";
import { buildDiagnostics } from "@/lib/ide/browser-lsp/diagnostics";
import {
    createSemanticCompletionItems,
    getSemanticValidationDescriptors,
    hasSemanticArgumentValidation,
} from "@/lib/ide/browser-lsp/semantic-validation";
import { createTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { testCatalog, testFunction, createRepresentativeCatalog } from "@/tests/fixtures/catalog";

function diagnostics(source: string, catalogResponse = createRepresentativeCatalog()) {
    return buildDiagnostics(
        createTextDocument("test://diagnostics", source),
        createCatalogFromResponse(catalogResponse),
    );
}

function catalogForDescriptor(functionName: string, argumentIndex: number, description: string, argumentCount: number) {
    const args = Array.from({ length: argumentCount }, (_, index) => ({
        name: `arg${index + 1}`,
        type: "String",
        description: index === argumentIndex ? description : "test argument",
    }));

    return testCatalog([testFunction(functionName, "String", args)]);
}

describe("generic diagnostics", () => {
    it("reports unknown, missing, extra, and incompatible arguments", () => {
        const messages = diagnostics('{unknown}\n{from_hex}\n{from_hex(1; "extra")}').map((item) => item.message);

        expect(messages).toContain("Unknown function 'unknown'");
        expect(messages.some((message) => message.includes("missing required argument"))).toBe(true);
        expect(messages.some((message) => message.includes("expects String; received Integer"))).toBe(true);
        expect(messages.some((message) => message.includes("argument 2 is extra"))).toBe(true);
    });

    it("reports duplicate variables, undefined placeholders, and template syntax", () => {
        const source = 'let x = "a";\nlet x = "b";\n@{missing} &z \\q &#1234';
        const messages = diagnostics(source).map((item) => item.message);

        expect(messages).toContain("Duplicate variable 'x'");
        expect(messages).toContain("Undefined variable 'missing'");
        expect(messages).toContain("Unknown formatting code '&z'");
        expect(messages).toContain("Unknown escape sequence '\\q'");
        expect(messages).toContain("Hex color codes must use &#AARRGGBB");
    });
});

describe("semantic registry", () => {
    const descriptors = getSemanticValidationDescriptors();
    const literalDescriptors = descriptors.filter((descriptor) => descriptor.kind === "allowedLiterals");
    const listDescriptors = descriptors.filter((descriptor) => descriptor.kind === "listElements");

    function validArgumentsFor(descriptor: (typeof literalDescriptors)[number], targetValue: string) {
        const siblingDescriptors = literalDescriptors.filter(
            (candidate) => candidate.functionName === descriptor.functionName,
        );
        const argumentCount = Math.max(...siblingDescriptors.map((candidate) => candidate.argumentIndex)) + 1;

        return Array.from({ length: argumentCount }, (_, argumentIndex) => {
            if (argumentIndex === descriptor.argumentIndex) {
                return JSON.stringify(targetValue);
            }

            const sibling = siblingDescriptors.find((candidate) => candidate.argumentIndex === argumentIndex);
            return JSON.stringify(sibling?.values[0] ?? "x");
        });
    }

    it("describes every registered constraint for generated tests and docs badges", () => {
        expect(new Set(descriptors.map((descriptor) => descriptor.functionName)).size).toBe(40);
        expect(literalDescriptors).toHaveLength(34);
        expect(listDescriptors).toHaveLength(8);
        expect(descriptors).toContainEqual({
            functionName: "switch_case",
            kind: "variadicPairs",
            argumentIndex: 2,
            minimumPairs: 1,
            listName: "cases",
        });
    });

    it.each(literalDescriptors)("accepts all $functionName argument $argumentIndex literals", (descriptor) => {
        const validArguments = validArgumentsFor(descriptor, descriptor.values[0]);
        const response = catalogForDescriptor(
            descriptor.functionName,
            descriptor.argumentIndex,
            descriptor.values.join(", "),
            validArguments.length,
        );

        for (const value of descriptor.values) {
            const source = `{${descriptor.functionName}(${validArgumentsFor(descriptor, value).join("; ")})}`;
            expect(diagnostics(source, response), `${descriptor.functionName}: ${value}`).toEqual([]);
        }
    });

    it.each(literalDescriptors)("rejects invalid $functionName argument $argumentIndex literals", (descriptor) => {
        const args = validArgumentsFor(descriptor, "__INVALID__");
        const response = catalogForDescriptor(
            descriptor.functionName,
            descriptor.argumentIndex,
            descriptor.values.join(", "),
            args.length,
        );
        const result = diagnostics(`{${descriptor.functionName}(${args.join("; ")})}`, response);

        expect(result).toHaveLength(1);
        expect(result[0].message).toContain("must be one of");
        expect(hasSemanticArgumentValidation(descriptor.functionName, descriptor.argumentIndex)).toBe(true);
    });

    it.each(literalDescriptors)("offers ranked completions for $functionName argument $argumentIndex", (descriptor) => {
        const response = catalogForDescriptor(
            descriptor.functionName,
            descriptor.argumentIndex,
            descriptor.values.join(", "),
            descriptor.argumentIndex + 1,
        );
        const metadata = createCatalogFromResponse(response).findByName(descriptor.functionName)!;
        const items = createSemanticCompletionItems(metadata, descriptor.argumentIndex);

        expect(items.map((item) => item.label)).toEqual(descriptor.values);
        expect(items.every((item) => item.sortText?.startsWith("00_"))).toBe(true);
    });

    it.each(listDescriptors)("validates every $elementType element passed to $functionName", (descriptor) => {
        const validValues: Record<string, string> = {
            Boolean: "true",
            Number: "1",
            String: '"value"',
            StyledText: 'styled_text("value")',
        };
        const invalidValues: Record<string, string> = {
            Boolean: "1",
            Number: '"value"',
            String: "true",
            StyledText: '"value"',
        };
        const response = testCatalog([
            testFunction(descriptor.functionName, "Object", [
                { name: "values", type: "List", description: `${descriptor.elementType} values` },
            ]),
            testFunction("styled_text", "StyledText", [{ name: "value", type: "String" }]),
        ]);
        const valid = validValues[descriptor.elementType];
        const invalid = invalidValues[descriptor.elementType];

        expect(diagnostics(`{${descriptor.functionName}(${valid}; ${valid})}`, response)).toEqual([]);
        expect(diagnostics(`{${descriptor.functionName}([${valid}, ${valid}])}`, response)).toEqual([]);

        const variadicResult = diagnostics(`{${descriptor.functionName}(${valid}; ${invalid})}`, response);
        const listResult = diagnostics(`{${descriptor.functionName}([${valid}, ${invalid}])}`, response);

        expect(variadicResult).toHaveLength(1);
        expect(variadicResult[0].message).toContain(`expects ${descriptor.elementType} elements`);
        expect(listResult).toHaveLength(1);
        expect(listResult[0].message).toContain(`expects ${descriptor.elementType} elements`);
        expect(hasSemanticArgumentValidation(descriptor.functionName, descriptor.argumentIndex)).toBe(true);
    });

    it("validates switch pairs, aliases, empty slots, type mismatches, and unknown values", () => {
        expect(diagnostics('{switch(1; "default"; [1, "one", 2, "two"])}')).toEqual([]);
        expect(diagnostics('{switch_case(1; "default"; 1; "one"; 2; "two")}')).toEqual([]);
        expect(diagnostics('{switch_case(@{dynamic}; "default"; [true, "yes"])}\nlet dynamic = true;')).toEqual([]);

        expect(diagnostics('{switch_case(1; "default")}')[0].message).toContain("requires at least");
        expect(diagnostics('{switch_case(1; "default"; [1, "one", 2])}')[0].message).toContain("paired result");
        expect(diagnostics('{switch_case(1; "default"; [1, , 2, "two"])}')[0].message).toContain("missing its result");
        expect(diagnostics('{switch_case(1; "default"; ["1", "one"])}')[0].message).toContain("expects Integer");
    });
});
