import { FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { normalizeArgumentType } from "@/lib/ide/browser-lsp/function-arguments";
import { TokenKind } from "@/lib/ide/browser-lsp/lexer";
import { FunctionCall, ParsedArgument } from "@/lib/ide/browser-lsp/parser";

const typeCompatibilityMap: Record<string, string[]> = {
    string: ["string"],
    identifier: ["string", "namedvalue"],
    boolean: ["boolean"],
    number: ["number"],
    integer: ["integer", "number", "long"],
    long: ["long", "number"],
    double: ["double", "number"],
    float: ["float", "number"],
    hexcolor: ["string", "customcolor"],
    customcolor: ["customcolor"],
    cappedvalue: ["cappedvalue"],
    rangedvalue: ["rangedvalue"],
    list: ["list"],
    object: ["object"],
    time: ["time", "number", "integer"],
    namedvalue: ["namedvalue"],
    location: ["location"],
    styledtext: ["styledtext"],
    any: ["any"],
};

export function inferArgumentType(
    argument: ParsedArgument,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
): string | undefined {
    return inferArgumentTypeWithSeenCalls(argument, callLookup, catalog, new Set());
}

function inferArgumentTypeWithSeenCalls(
    argument: ParsedArgument | undefined,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
    seenCallOffsets: Set<number>,
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
            case TokenKind.Identifier: {
                const possibleCall = callLookup.get(firstToken.offset);

                if (possibleCall && possibleCall.isBareExpression) {
                    return inferFunctionCallReturnType(possibleCall, callLookup, catalog, seenCallOffsets);
                }

                return "Identifier";
            }
            case TokenKind.Placeholder:
                return undefined;
            default:
                return undefined;
        }
    }

    if (firstToken.kind === TokenKind.Identifier && argument.tokens[1]?.kind === TokenKind.LeftParenthesis) {
        const possibleCall = callLookup.get(firstToken.offset);

        if (possibleCall && possibleCall.endOffset === argument.endOffset) {
            return inferFunctionCallReturnType(possibleCall, callLookup, catalog, seenCallOffsets);
        }
    }

    return undefined;
}

function inferFunctionCallReturnType(
    functionCall: FunctionCall,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
    seenCallOffsets: Set<number>,
): string | undefined {
    const metadata = catalog.findByName(functionCall.name);

    if (!metadata) {
        return undefined;
    }

    if (normalizeArgumentType(functionCall.name) !== "if") {
        return metadata.returnType;
    }

    if (seenCallOffsets.has(functionCall.startOffset)) {
        return metadata.returnType;
    }

    seenCallOffsets.add(functionCall.startOffset);

    const trueBranchType = inferArgumentTypeWithSeenCalls(functionCall.arguments[1], callLookup, catalog, seenCallOffsets);
    const falseBranchType = inferArgumentTypeWithSeenCalls(functionCall.arguments[2], callLookup, catalog, seenCallOffsets);

    seenCallOffsets.delete(functionCall.startOffset);

    return resolveConditionalReturnType(trueBranchType, falseBranchType) ?? metadata.returnType;
}

function resolveConditionalReturnType(trueBranchType: string | undefined, falseBranchType: string | undefined): string | undefined {
    if (!trueBranchType) {
        return falseBranchType;
    }

    if (!falseBranchType) {
        return trueBranchType;
    }

    if (isTypeCompatible(trueBranchType, falseBranchType)) {
        return trueBranchType;
    }

    if (isTypeCompatible(falseBranchType, trueBranchType)) {
        return falseBranchType;
    }

    return undefined;
}

export function isTypeCompatible(expectedType: string, actualType: string) {
    const normalizedExpected = normalizeArgumentType(expectedType);
    const normalizedActual = normalizeArgumentType(actualType);

    if (
        normalizedExpected === "any" ||
        normalizedExpected === "object" ||
        normalizedExpected === "" ||
        normalizedActual === "object"
    ) {
        return true;
    }

    const compatibleTargets = typeCompatibilityMap[normalizedActual] ?? [normalizedActual];

    return compatibleTargets.includes(normalizedExpected);
}
