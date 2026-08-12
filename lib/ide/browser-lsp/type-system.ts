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
    context = createTypeInferenceContext(),
): string | undefined {
    return inferArgumentTypeWithSeenCalls(argument, callLookup, catalog, new Set(), context);
}

export type TypeInferenceContext = {
    argumentTypes: Map<string, string | undefined>;
    callReturnTypes: Map<number, string | undefined>;
};

export function createTypeInferenceContext(): TypeInferenceContext {
    return {
        argumentTypes: new Map(),
        callReturnTypes: new Map(),
    };
}

function inferArgumentTypeWithSeenCalls(
    argument: ParsedArgument | undefined,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
    seenCallOffsets: Set<number>,
    context: TypeInferenceContext,
): string | undefined {
    if (!argument || argument.text.length === 0 || argument.tokens.length === 0) {
        return undefined;
    }

    const cacheKey = argumentCacheKey(argument);
    if (context.argumentTypes.has(cacheKey)) {
        return context.argumentTypes.get(cacheKey);
    }

    const inferredType = inferArgumentTypeUncached(argument, callLookup, catalog, seenCallOffsets, context);
    context.argumentTypes.set(cacheKey, inferredType);

    return inferredType;
}

function inferArgumentTypeUncached(
    argument: ParsedArgument,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
    seenCallOffsets: Set<number>,
    context: TypeInferenceContext,
): string | undefined {
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
                    return inferFunctionCallReturnType(possibleCall, callLookup, catalog, seenCallOffsets, context);
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
            return inferFunctionCallReturnType(possibleCall, callLookup, catalog, seenCallOffsets, context);
        }
    }

    return undefined;
}

function argumentCacheKey(argument: ParsedArgument) {
    return `${argument.startOffset}:${argument.endOffset}:${argument.tokens.length}`;
}

function inferFunctionCallReturnType(
    functionCall: FunctionCall,
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
    seenCallOffsets: Set<number>,
    context: TypeInferenceContext,
): string | undefined {
    if (context.callReturnTypes.has(functionCall.startOffset)) {
        return context.callReturnTypes.get(functionCall.startOffset);
    }

    const metadata = catalog.findByName(functionCall.name);

    if (!metadata) {
        return undefined;
    }

    if (normalizeArgumentType(functionCall.name) !== "if") {
        context.callReturnTypes.set(functionCall.startOffset, metadata.returnType);
        return metadata.returnType;
    }

    if (seenCallOffsets.has(functionCall.startOffset)) {
        return metadata.returnType;
    }

    seenCallOffsets.add(functionCall.startOffset);

    const trueBranchType = inferArgumentTypeWithSeenCalls(
        functionCall.arguments[1],
        callLookup,
        catalog,
        seenCallOffsets,
        context,
    );
    const falseBranchType = inferArgumentTypeWithSeenCalls(
        functionCall.arguments[2],
        callLookup,
        catalog,
        seenCallOffsets,
        context,
    );

    seenCallOffsets.delete(functionCall.startOffset);

    const returnType = resolveConditionalReturnType(trueBranchType, falseBranchType) ?? metadata.returnType;
    context.callReturnTypes.set(functionCall.startOffset, returnType);

    return returnType;
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
        normalizedActual === "any" ||
        normalizedActual === "object"
    ) {
        return true;
    }

    const compatibleTargets = typeCompatibilityMap[normalizedActual] ?? [normalizedActual];

    return compatibleTargets.includes(normalizedExpected);
}
