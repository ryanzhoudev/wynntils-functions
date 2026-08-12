import { describe, expect, it } from "vitest";
import { findCallContext, findCallContextStack } from "@/lib/ide/browser-lsp/call-context";
import { FunctionsCatalog, createCatalogFromResponse, buildSnippet, formatSignature } from "@/lib/ide/browser-lsp/catalog";
import {
    canOmitArgument,
    formatArgumentLabel,
    resolveArgumentSlot,
    resolveCompletionType,
} from "@/lib/ide/browser-lsp/function-arguments";
import { lex, TokenKind } from "@/lib/ide/browser-lsp/lexer";
import { parse } from "@/lib/ide/browser-lsp/parser";
import { createTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { createTypeInferenceContext, inferArgumentType, isTypeCompatible } from "@/lib/ide/browser-lsp/type-system";
import { createRepresentativeCatalog } from "@/tests/fixtures/catalog";

describe("lexer and parser", () => {
    it("lexes structural, literal, placeholder, list, and comment syntax with offsets", () => {
        const source = '{fn(true; -1.5; "x\\n"; r"raw"; #aabbcc; @{value}; [1, 2])} // ignored';
        const tokens = lex(source);

        expect(tokens.map((token) => token.kind)).toEqual([
            TokenKind.LeftBrace,
            TokenKind.Identifier,
            TokenKind.LeftParenthesis,
            TokenKind.Boolean,
            TokenKind.Semicolon,
            TokenKind.Number,
            TokenKind.Semicolon,
            TokenKind.StringLiteral,
            TokenKind.Semicolon,
            TokenKind.StringLiteral,
            TokenKind.Semicolon,
            TokenKind.HexLiteral,
            TokenKind.Semicolon,
            TokenKind.Placeholder,
            TokenKind.Semicolon,
            TokenKind.LeftBracket,
            TokenKind.Number,
            TokenKind.Comma,
            TokenKind.Number,
            TokenKind.RightBracket,
            TokenKind.RightParenthesis,
            TokenKind.RightBrace,
        ]);
        expect(tokens[1]).toMatchObject({ value: "fn", offset: 1, length: 2 });
    });

    it("parses nested calls, list arguments, bare calls, and valid format suffixes", () => {
        const source = "{outer(inner(1); [1, \"two\"]; bare):F2}";
        const result = parse(source);
        const outer = result.calls.find((call) => call.name === "outer");

        expect(result.errors).toEqual([]);
        expect(outer?.arguments.map((argument) => argument.text)).toEqual(["inner(1)", '[1, "two"]', "bare"]);
        expect(outer?.formatSuffix).toMatchObject({ text: ":F2", formatted: true, decimals: 2, isValid: true });
        expect(result.calls.find((call) => call.name === "bare")).toMatchObject({ isBareExpression: true });
    });

    it("reports unmatched braces and missing parentheses at exact offsets", () => {
        const result = parse("}{missing(");

        expect(result.errors).toEqual([
            { offset: 0, length: 1, message: "Unmatched }" },
            { offset: 1, length: 1, message: "Unmatched {" },
            { offset: 2, length: 7, message: "Missing ')' for missing" },
        ]);
    });

    it("marks malformed format suffixes invalid", () => {
        const call = parse("{value:wat}").calls[0];
        expect(call.formatSuffix).toMatchObject({ isValid: false, text: ":wat" });
    });
});

describe("document and call context", () => {
    it("round-trips offsets and positions across mixed newlines", () => {
        const document = createTextDocument("test://doc", "one\r\ntwo\nthree");
        const position = document.positionAt(9);

        expect(position).toEqual({ line: 2, character: 0 });
        expect(document.offsetAt(position)).toBe(9);
        expect(document.offsetAt({ line: 99, character: 99 })).toBe(14);
    });

    it("tracks nested active calls and semicolon-delimited parameters", () => {
        const source = "{outer(1; inner(true; value";
        const stack = findCallContextStack(source, source.length);

        expect(stack.map((context) => [context.functionName, context.activeParameter])).toEqual([
            ["outer", 1],
            ["inner", 1],
        ]);
        expect(findCallContext(source, source.length)?.functionName).toBe("inner");
    });
});

describe("catalog, argument resolution, and type inference", () => {
    const response = createRepresentativeCatalog();
    const catalog = createCatalogFromResponse(response);

    it("resolves canonical names, aliases, signatures, and snippets", () => {
        const metadata = catalog.findByName("switch")!;

        expect(metadata.canonicalName).toBe("switch_case");
        expect(formatSignature(metadata, true, true)).toBe("(switch: Object; default: Object; cases: List...)");
        expect(buildSnippet(metadata, "switch", false)).toBe("switch(${1:switch}; ${2:default}; ${3:cases})$0");
    });

    it("maps variadic list slots and completion types", () => {
        const metadata = catalog.findByName("switch_case")!;
        const listSlot = resolveArgumentSlot(metadata.arguments, 8)!;

        expect(listSlot).toMatchObject({ index: 2, isListRest: true });
        expect(canOmitArgument(listSlot.argument)).toBe(true);
        expect(formatArgumentLabel(listSlot.argument)).toBe("cases: List...");
        expect(resolveCompletionType(listSlot.argument)).toBe("Number");
    });

    it("infers literals and nested function return types", () => {
        const source = '{accessory_durability("Ring_1")}';
        const parsed = parse(source);
        const lookup = new Map(parsed.calls.map((call) => [call.startOffset, call]));
        const outer = parsed.calls.find((call) => call.name === "accessory_durability")!;

        expect(inferArgumentType(outer.arguments[0], lookup, catalog)).toBe("String");
        expect(isTypeCompatible("Number", "Integer")).toBe(true);
        expect(isTypeCompatible("Number", "Any")).toBe(true);
        expect(isTypeCompatible("Boolean", "String")).toBe(false);
        expect(createTypeInferenceContext().argumentTypes.size).toBe(0);
    });

    it("allows constructing an empty catalog", () => {
        expect(new FunctionsCatalog([]).getAllFunctions()).toEqual([]);
    });
});
