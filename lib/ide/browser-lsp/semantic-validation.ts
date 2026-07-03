import type { FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import type { FunctionCall, ParsedArgument } from "@/lib/ide/browser-lsp/parser";
import { TokenKind } from "@/lib/ide/browser-lsp/lexer";
import { isTypeCompatible, type TypeInferenceContext, inferArgumentType } from "@/lib/ide/browser-lsp/type-system";
import type { LspCompletionItem } from "@/lib/ide/types";

export type SemanticIssue = {
    offset: number;
    length: number;
    message: string;
};

export type SemanticValidationContext = {
    functionCall: FunctionCall;
    metadata: FunctionMetadata;
    sourceText: string;
    inferType(argument: ParsedArgument | undefined): string | undefined;
    isStaticallyKnownLiteral(argument: ParsedArgument | undefined): argument is ParsedArgument;
};

export type SemanticCompletionContext = {
    activeParameter: number;
    metadata: FunctionMetadata;
};

export type SemanticConstraint = {
    validate?(context: SemanticValidationContext): SemanticIssue[];
    complete?(context: SemanticCompletionContext): LspCompletionItem[];
    ownsBareIdentifier?(argumentIndex: number): boolean;
};

export type FunctionSemanticSpec = {
    constraints: SemanticConstraint[];
    validate?(context: SemanticValidationContext): SemanticIssue[];
    complete?(context: SemanticCompletionContext): LspCompletionItem[];
};

export type SemanticValidationRuntime = {
    callLookup: Map<number, FunctionCall>;
    catalog: FunctionsCatalog;
    sourceText: string;
    typeInferenceContext: TypeInferenceContext;
};

export type VariadicPairOptions = {
    startIndex: number;
    minimumPairs: number;
    keyConstraint?: PairKeyConstraint;
    listName: string;
};

export type PairKeyConstraint = {
    validate(
        keyArgument: ParsedArgument,
        context: SemanticValidationContext,
        pairIndex: number,
    ): SemanticIssue[];
};

const COMPLETION_ITEM_KIND_ENUM_MEMBER = 20;

const semanticSpecs = new Map<string, FunctionSemanticSpec>([
    [
        "accessory_durability",
        {
            constraints: [allowedLiterals(0, ["Ring_1", "Ring_2", "Bracelet", "Necklace"])],
        },
    ],
    [
        "switch_case",
        {
            constraints: [
                variadicPairs({
                    startIndex: 2,
                    minimumPairs: 1,
                    listName: "cases",
                    keyConstraint: sameTypeAsArgument(0),
                }),
            ],
        },
    ],
]);

export function validateFunctionSemantics(
    functionCall: FunctionCall,
    metadata: FunctionMetadata,
    runtime: SemanticValidationRuntime,
): SemanticIssue[] {
    const spec = semanticSpecs.get(normalizeName(metadata.canonicalName));

    if (!spec) {
        return [];
    }

    const context = createValidationContext(functionCall, metadata, runtime);
    const issues = spec.constraints.flatMap((constraint) => constraint.validate?.(context) ?? []);

    return issues.concat(spec.validate?.(context) ?? []);
}

export function collectSemanticBareLiteralOffsets(
    functionCalls: FunctionCall[],
    catalog: FunctionsCatalog,
): Set<number> {
    const offsets = new Set<number>();

    for (const functionCall of functionCalls) {
        const metadata = catalog.findByName(functionCall.name);

        if (!metadata) {
            continue;
        }

        const spec = semanticSpecs.get(normalizeName(metadata.canonicalName));

        if (!spec) {
            continue;
        }

        for (let argumentIndex = 0; argumentIndex < functionCall.arguments.length; argumentIndex++) {
            const argument = functionCall.arguments[argumentIndex];

            if (
                argument.tokens.length === 1 &&
                argument.tokens[0].kind === TokenKind.Identifier &&
                spec.constraints.some((constraint) => constraint.ownsBareIdentifier?.(argumentIndex))
            ) {
                offsets.add(argument.tokens[0].offset);
            }
        }
    }

    return offsets;
}

export function createSemanticCompletionItems(
    metadata: FunctionMetadata | undefined,
    activeParameter: number,
): LspCompletionItem[] {
    if (!metadata) {
        return [];
    }

    const spec = semanticSpecs.get(normalizeName(metadata.canonicalName));

    if (!spec) {
        return [];
    }

    const context = { activeParameter, metadata };
    const items = spec.constraints.flatMap((constraint) => constraint.complete?.(context) ?? []);

    return items.concat(spec.complete?.(context) ?? []);
}

export function allowedLiterals(argumentIndex: number, values: string[]): SemanticConstraint {
    const allowedValues = new Set(values);
    const expectedValues = values.map((value) => `'${value}'`).join(", ");

    return {
        ownsBareIdentifier(activeArgumentIndex) {
            return activeArgumentIndex === argumentIndex;
        },
        validate(context) {
            const argument = context.functionCall.arguments[argumentIndex];

            if (!context.isStaticallyKnownLiteral(argument)) {
                return [];
            }

            const token = argument.tokens[0];
            const value = "value" in token ? token.value : "";

            if (allowedValues.has(value)) {
                return [];
            }

            return [issueForArgument(argument, `'${context.metadata.canonicalName}' argument ${argumentIndex + 1} must be one of ${expectedValues}.`)];
        },
        complete(context) {
            if (context.activeParameter !== argumentIndex) {
                return [];
            }

            return values.map((value, index) => ({
                label: value,
                kind: COMPLETION_ITEM_KIND_ENUM_MEMBER,
                detail: `${context.metadata.canonicalName} allowed value`,
                insertText: value,
                sortText: `00_${String(index).padStart(3, "0")}_${value}`,
            }));
        },
    };
}

export function variadicPairs(options: VariadicPairOptions): SemanticConstraint {
    return {
        validate(context) {
            const listArgument = context.functionCall.arguments[options.startIndex];
            const elements = listArgument
                ? parseListElements(listArgument, context.sourceText) ?? context.functionCall.arguments.slice(options.startIndex)
                : [];
            const minimumElements = options.minimumPairs * 2;
            const issues: SemanticIssue[] = [];

            if (elements.length === 0 || elements.every((argument) => !hasValue(argument))) {
                return [
                    issueForCall(
                        context.functionCall,
                        `'${context.metadata.canonicalName}' requires at least ${options.minimumPairs} complete ${formatPairCount(options.minimumPairs)} in '${options.listName}'.`,
                    ),
                ];
            }

            if (elements.length < minimumElements) {
                const unmatchedArgument = elements.at(-1);

                return [
                    unmatchedArgument && hasValue(unmatchedArgument)
                        ? issueForArgument(
                              unmatchedArgument,
                              `'${context.metadata.canonicalName}' ${options.listName} value must be followed by its paired result.`,
                          )
                        : issueForCall(
                              context.functionCall,
                              `'${context.metadata.canonicalName}' requires at least ${options.minimumPairs} complete ${formatPairCount(options.minimumPairs)} in '${options.listName}'.`,
                          ),
                ];
            }

            if (elements.length % 2 !== 0) {
                const unmatchedArgument = elements[elements.length - 1];
                issues.push(
                    hasValue(unmatchedArgument)
                        ? issueForArgument(
                              unmatchedArgument,
                              `'${context.metadata.canonicalName}' ${options.listName} value must be followed by its paired result.`,
                          )
                        : issueForCall(
                              context.functionCall,
                              `'${context.metadata.canonicalName}' '${options.listName}' must contain complete value/result pairs.`,
                          ),
                );
            }

            for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
                const argument = elements[elementIndex];
                const role = elementIndex % 2 === 0 ? "test value" : "result";

                if (!hasValue(argument)) {
                    issues.push(
                        issueForCall(
                            context.functionCall,
                            `'${context.metadata.canonicalName}' ${options.listName} pair ${Math.floor(elementIndex / 2) + 1} is missing its ${role}.`,
                        ),
                    );
                    continue;
                }

                if (elementIndex % 2 === 0 && options.keyConstraint) {
                    issues.push(...options.keyConstraint.validate(argument, context, Math.floor(elementIndex / 2)));
                }
            }

            return issues;
        },
    };
}

export function sameTypeAsArgument(referenceArgumentIndex: number): PairKeyConstraint {
    return {
        validate(keyArgument, context, pairIndex) {
            const referenceArgument = context.functionCall.arguments[referenceArgumentIndex];
            const referenceType = context.inferType(referenceArgument);
            const keyType = context.inferType(keyArgument);

            if (!referenceType || !keyType || isTypeCompatible(referenceType, keyType)) {
                return [];
            }

            return [
                issueForArgument(
                    keyArgument,
                    `'${context.metadata.canonicalName}' case ${pairIndex + 1} expects ${referenceType} to match argument ${referenceArgumentIndex + 1}; received ${keyType}.`,
                ),
            ];
        },
    };
}

function createValidationContext(
    functionCall: FunctionCall,
    metadata: FunctionMetadata,
    runtime: SemanticValidationRuntime,
): SemanticValidationContext {
    return {
        functionCall,
        metadata,
        sourceText: runtime.sourceText,
        inferType(argument) {
            if (!argument || !hasValue(argument)) {
                return undefined;
            }

            return inferArgumentType(argument, runtime.callLookup, runtime.catalog, runtime.typeInferenceContext);
        },
        isStaticallyKnownLiteral(argument): argument is ParsedArgument {
            if (!argument || argument.tokens.length !== 1) {
                return false;
            }

            const token = argument.tokens[0];

            if (token.kind !== TokenKind.Identifier && token.kind !== TokenKind.StringLiteral) {
                return false;
            }

            if (token.kind !== TokenKind.Identifier) {
                return true;
            }

            const possibleCall = runtime.callLookup.get(token.offset);

            return !possibleCall || !runtime.catalog.findByName(possibleCall.name);
        },
    };
}

function parseListElements(argument: ParsedArgument, sourceText: string): ParsedArgument[] | null {
    if (
        argument.tokens[0]?.kind !== TokenKind.LeftBracket ||
        argument.tokens[argument.tokens.length - 1]?.kind !== TokenKind.RightBracket
    ) {
        return null;
    }

    const elementTokenGroups: ParsedArgument["tokens"][] = [];
    let currentTokens: ParsedArgument["tokens"] = [];
    let bracketDepth = 0;
    let parenthesisDepth = 0;

    for (const token of argument.tokens.slice(1, -1)) {
        if (token.kind === TokenKind.Comma && bracketDepth === 0 && parenthesisDepth === 0) {
            elementTokenGroups.push(currentTokens);
            currentTokens = [];
            continue;
        }

        currentTokens.push(token);

        if (token.kind === TokenKind.LeftBracket) {
            bracketDepth++;
        } else if (token.kind === TokenKind.RightBracket) {
            bracketDepth--;
        } else if (token.kind === TokenKind.LeftParenthesis) {
            parenthesisDepth++;
        } else if (token.kind === TokenKind.RightParenthesis) {
            parenthesisDepth--;
        }
    }

    if (currentTokens.length > 0 || elementTokenGroups.length > 0) {
        elementTokenGroups.push(currentTokens);
    }

    return elementTokenGroups.map((tokens) => {
        if (tokens.length === 0) {
            return { text: "", startOffset: -1, endOffset: -1, tokens };
        }

        const startOffset = tokens[0].offset;
        const lastToken = tokens[tokens.length - 1];
        const endOffset = lastToken.offset + lastToken.length;

        return {
            text: sourceText.slice(startOffset, endOffset).trim(),
            startOffset,
            endOffset,
            tokens,
        };
    });
}

function hasValue(argument: ParsedArgument | undefined): argument is ParsedArgument {
    return Boolean(argument && argument.tokens.length > 0 && argument.text.trim().length > 0);
}

function issueForArgument(argument: ParsedArgument, message: string): SemanticIssue {
    return {
        offset: argument.startOffset,
        length: Math.max(argument.endOffset - argument.startOffset, 1),
        message,
    };
}

function issueForCall(functionCall: FunctionCall, message: string): SemanticIssue {
    return {
        offset: functionCall.startOffset,
        length: Math.max(functionCall.endOffset - functionCall.startOffset, 1),
        message,
    };
}

function formatPairCount(count: number) {
    return count === 1 ? "case/result pair" : "case/result pairs";
}

function normalizeName(name: string) {
    return name.trim().toLowerCase();
}
