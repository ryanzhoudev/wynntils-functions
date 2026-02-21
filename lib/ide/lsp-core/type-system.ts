// Adapted from DevChromium/wynntils-functions-tools (MIT License).

import { FunctionsCatalog } from "@/lib/ide/lsp-core/catalog";
import { TokenKind } from "@/lib/ide/lsp-core/lexer";
import { FunctionCall, ParsedArgument } from "@/lib/ide/lsp-core/parser";

const typeCompatibilityMap: Record<string, string[]> = {
    string: ["string"],
    identifier: ["string", "namedvalue"],
    boolean: ["boolean"],
    number: ["number"],
    integer: ["integer", "number", "long"],
    long: ["long", "number"],
    hexcolor: ["string", "customcolor"],
    customcolor: ["customcolor"],
    cappedvalue: ["cappedvalue"],
    rangedvalue: ["rangedvalue"],
    list: ["list"],
    object: ["object"],
    time: ["time", "number", "integer"],
    namedvalue: ["namedvalue"],
    location: ["location"],
    any: ["any"],
};

export function inferArgumentType(
    argument: ParsedArgument,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
): string | undefined {
    if (!argument || argument.text.length === 0 || argument.tokens.length === 0) {
        return undefined;
    }

    const firstToken = argument.tokens[0];
    const tokenCount = argument.tokens.length;

    if (tokenCount === 1) {
        switch (firstToken.kind) {
            case TokenKind.StringLiteral:
                return "String";
            case TokenKind.Boolean:
                return "Boolean";
            case TokenKind.Number:
                return firstToken.value.includes(".") ? "Number" : "Integer";
            case TokenKind.HexLiteral:
                return "HexColor";
            case TokenKind.Identifier:
                return "Identifier";
            case TokenKind.Placeholder:
                return undefined;
            default:
                return undefined;
        }
    }

    if (firstToken.kind === TokenKind.Identifier && argument.tokens[1]?.kind === TokenKind.LeftParenthesis) {
        const possibleCall = callLookup.get(firstToken.offset);

        if (possibleCall && possibleCall.endOffset === argument.endOffset) {
            const metadata = catalog.findByName(possibleCall.name);

            if (metadata) {
                return metadata.returnType;
            }
        }
    }

    return undefined;
}

export function isTypeCompatible(expectedType: string, actualType: string): boolean {
    const normalizedExpected = normalizeType(expectedType);
    const normalizedActual = normalizeType(actualType);

    if (normalizedExpected === "any" || normalizedExpected === "") {
        return true;
    }

    const compatibleTargets = typeCompatibilityMap[normalizedActual] ?? [normalizedActual];

    return compatibleTargets.includes(normalizedExpected);
}

function normalizeType(typeName: string) {
    return (typeName ?? "").toLowerCase();
}
