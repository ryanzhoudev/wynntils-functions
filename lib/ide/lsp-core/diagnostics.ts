// Adapted from DevChromium/wynntils-functions-tools (MIT License).

import { FunctionsCatalog } from "@/lib/ide/lsp-core/catalog";
import { FunctionCall, ParsedArgument, parse } from "@/lib/ide/lsp-core/parser";
import { inferArgumentType, isTypeCompatible } from "@/lib/ide/lsp-core/type-system";
import { FunctionMetadataArgument, LspDiagnostic } from "@/lib/ide/types";

const VARIABLE_DECLARATION_PATTERN = /^\s*let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]*);/gm;
const PLACEHOLDER_PATTERN = /[@$]\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

interface VariableDeclaration {
    offset: number;
    length: number;
}

function createDiagnostic(
    startOffset: number,
    endOffset: number,
    severity: LspDiagnostic["severity"],
    message: string,
): LspDiagnostic {
    return {
        startOffset,
        endOffset: Math.max(endOffset, startOffset + 1),
        severity,
        message,
    };
}

function collectVariableDeclarations(documentText: string, diagnostics: LspDiagnostic[]) {
    const declarations = new Map<string, VariableDeclaration>();
    let match: RegExpExecArray | null;

    while ((match = VARIABLE_DECLARATION_PATTERN.exec(documentText)) !== null) {
        const variableName = match[1];
        const declarationOffset = match.index;
        const declarationLength = match[0].length;

        if (declarations.has(variableName)) {
            diagnostics.push(
                createDiagnostic(
                    declarationOffset,
                    declarationOffset + declarationLength,
                    "warning",
                    `Duplicate variable '${variableName}'`,
                ),
            );
            continue;
        }

        declarations.set(variableName, { offset: declarationOffset, length: declarationLength });
    }

    return declarations;
}

function reportUndefinedPlaceholders(
    documentText: string,
    diagnostics: LspDiagnostic[],
    declaredVariables: Map<string, VariableDeclaration>,
) {
    let match: RegExpExecArray | null;

    while ((match = PLACEHOLDER_PATTERN.exec(documentText)) !== null) {
        const variableName = match[1];
        const placeholderOffset = match.index;
        const placeholderLength = match[0].length;

        if (!declaredVariables.has(variableName)) {
            diagnostics.push(
                createDiagnostic(
                    placeholderOffset,
                    placeholderOffset + placeholderLength,
                    "error",
                    `Undefined variable '${variableName}'`,
                ),
            );
        }
    }
}

function hasValue(argument: ParsedArgument | undefined): argument is ParsedArgument {
    if (!argument) {
        return false;
    }

    if (argument.tokens.length === 0) {
        return false;
    }

    if (argument.text.trim().length === 0) {
        return false;
    }

    return true;
}

function validateArguments(
    functionCall: FunctionCall,
    expectedArguments: FunctionMetadataArgument[],
    diagnostics: LspDiagnostic[],
    callLookup: Map<number, FunctionCall>,
    catalog: FunctionsCatalog,
) {
    const providedArguments = functionCall.arguments;
    const expectedCount = expectedArguments.length;

    for (let index = 0; index < expectedCount; index++) {
        const expectedArgument = expectedArguments[index];
        const providedArgument = providedArguments[index];

        if (!hasValue(providedArgument)) {
            if (expectedArgument.required) {
                diagnostics.push(
                    createDiagnostic(
                        functionCall.startOffset,
                        functionCall.endOffset,
                        "error",
                        `'${functionCall.name}' is missing required argument '${expectedArgument.name}'`,
                    ),
                );
            }
            continue;
        }

        const inferredType = inferArgumentType(providedArgument, callLookup, catalog);

        if (!inferredType) {
            continue;
        }

        if (!isTypeCompatible(expectedArgument.type, inferredType)) {
            const startOffset = providedArgument.startOffset >= 0 ? providedArgument.startOffset : functionCall.startOffset;
            const endOffset = providedArgument.endOffset >= 0 ? providedArgument.endOffset : functionCall.startOffset + 1;

            diagnostics.push(
                createDiagnostic(
                    startOffset,
                    endOffset,
                    "error",
                    `'${functionCall.name}' argument '${expectedArgument.name}' expects ${expectedArgument.type}; received ${inferredType}`,
                ),
            );
        }
    }

    for (let index = expectedCount; index < providedArguments.length; index++) {
        const extraArgument = providedArguments[index];

        if (!hasValue(extraArgument)) {
            continue;
        }

        const startOffset = extraArgument.startOffset >= 0 ? extraArgument.startOffset : functionCall.startOffset;
        const endOffset = extraArgument.endOffset >= 0 ? extraArgument.endOffset : functionCall.endOffset;

        diagnostics.push(
            createDiagnostic(
                startOffset,
                endOffset,
                "warning",
                `'${functionCall.name}' does not accept argument ${index + 1}`,
            ),
        );
    }
}

function reportFunctionIssues(documentText: string, diagnostics: LspDiagnostic[], catalog: FunctionsCatalog) {
    const parseResult = parse(documentText);
    const callLookup = new Map<number, FunctionCall>();

    for (const functionCall of parseResult.calls) {
        callLookup.set(functionCall.startOffset, functionCall);
    }

    for (const parseError of parseResult.errors) {
        diagnostics.push(
            createDiagnostic(parseError.offset, parseError.offset + parseError.length, "error", parseError.message),
        );
    }

    for (const functionCall of parseResult.calls) {
        const metadata = catalog.findByName(functionCall.name);

        if (!metadata) {
            diagnostics.push(
                createDiagnostic(
                    functionCall.startOffset,
                    functionCall.startOffset + functionCall.name.length,
                    "warning",
                    `Unknown function '${functionCall.name}'`,
                ),
            );
            continue;
        }

        validateArguments(functionCall, metadata.arguments, diagnostics, callLookup, catalog);
    }
}

export function buildDiagnostics(documentText: string, catalog: FunctionsCatalog): LspDiagnostic[] {
    const diagnostics: LspDiagnostic[] = [];

    const declaredVariables = collectVariableDeclarations(documentText, diagnostics);

    reportUndefinedPlaceholders(documentText, diagnostics, declaredVariables);
    reportFunctionIssues(documentText, diagnostics, catalog);

    return diagnostics;
}
