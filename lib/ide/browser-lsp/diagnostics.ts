import { FunctionArgumentMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { FunctionCall, parse, ParsedArgument } from "@/lib/ide/browser-lsp/parser";
import { BrowserTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { inferArgumentType, isTypeCompatible } from "@/lib/ide/browser-lsp/type-system";
import { LspDiagnostic } from "@/lib/ide/types";

const VARIABLE_DECLARATION_PATTERN = /^\s*let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]*);/gm;
const PLACEHOLDER_PATTERN = /[@$]\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const VALID_FORMATTING_CODES = new Set("0123456789abcdefklmnorABCDEFKLMNOR".split(""));
const VALID_ESCAPES = new Set(["\\", "n", "{", "}", "E", "B", "L", "M", "H", "&"]);

const DIAGNOSTIC_SEVERITY_ERROR = 1;
const DIAGNOSTIC_SEVERITY_WARNING = 2;

type VariableDeclaration = {
    offset: number;
    length: number;
};

export function buildDiagnostics(document: BrowserTextDocument, catalog: FunctionsCatalog): LspDiagnostic[] {
    const diagnostics: LspDiagnostic[] = [];
    const documentText = document.getText();

    const declaredVariables = collectVariableDeclarations(documentText, document, diagnostics);
    reportUndefinedPlaceholders(documentText, document, diagnostics, declaredVariables);
    reportFunctionIssues(documentText, document, diagnostics, catalog);
    reportTemplateSyntaxIssues(documentText, document, diagnostics);

    return diagnostics;
}

function collectVariableDeclarations(
    documentText: string,
    document: BrowserTextDocument,
    diagnostics: LspDiagnostic[],
) {
    const declarations = new Map<string, VariableDeclaration>();
    let match: RegExpExecArray | null;

    VARIABLE_DECLARATION_PATTERN.lastIndex = 0;

    while ((match = VARIABLE_DECLARATION_PATTERN.exec(documentText)) !== null) {
        const variableName = match[1];
        const declarationOffset = match.index;
        const declarationLength = match[0].length;

        if (declarations.has(variableName)) {
            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    declarationOffset,
                    declarationLength,
                    DIAGNOSTIC_SEVERITY_WARNING,
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
    document: BrowserTextDocument,
    diagnostics: LspDiagnostic[],
    declaredVariables: Map<string, VariableDeclaration>,
) {
    let match: RegExpExecArray | null;

    PLACEHOLDER_PATTERN.lastIndex = 0;

    while ((match = PLACEHOLDER_PATTERN.exec(documentText)) !== null) {
        const variableName = match[1];
        const placeholderOffset = match.index;
        const placeholderLength = match[0].length;

        if (!declaredVariables.has(variableName)) {
            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    placeholderOffset,
                    placeholderLength,
                    DIAGNOSTIC_SEVERITY_ERROR,
                    `Undefined variable '${variableName}'`,
                ),
            );
        }
    }
}

function reportFunctionIssues(
    documentText: string,
    document: BrowserTextDocument,
    diagnostics: LspDiagnostic[],
    catalog: FunctionsCatalog,
) {
    const parseResult = parse(documentText);
    const callLookup = new Map<number, FunctionCall>();

    for (const functionCall of parseResult.calls) {
        callLookup.set(functionCall.startOffset, functionCall);
    }

    for (const parseError of parseResult.errors) {
        diagnostics.push(
            createDiagnostic(
                document,
                documentText,
                parseError.offset,
                parseError.length,
                DIAGNOSTIC_SEVERITY_ERROR,
                parseError.message,
            ),
        );
    }

    for (const functionCall of parseResult.calls) {
        const metadata = catalog.findByName(functionCall.name);

        if (functionCall.formatSuffix && !functionCall.formatSuffix.isValid) {
            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    functionCall.formatSuffix.startOffset,
                    functionCall.formatSuffix.endOffset - functionCall.formatSuffix.startOffset,
                    DIAGNOSTIC_SEVERITY_ERROR,
                    functionCall.formatSuffix.error ?? "Invalid format suffix",
                ),
            );
        }

        if (!metadata) {
            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    functionCall.startOffset,
                    functionCall.name.length,
                    DIAGNOSTIC_SEVERITY_ERROR,
                    `Unknown function '${functionCall.name}'`,
                ),
            );
            continue;
        }

        validateArguments(functionCall, metadata.arguments, document, documentText, diagnostics, callLookup, catalog);
    }
}

function validateArguments(
    functionCall: FunctionCall,
    expectedArguments: FunctionArgumentMetadata[],
    document: BrowserTextDocument,
    documentText: string,
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
                        document,
                        documentText,
                        functionCall.startOffset,
                        functionCall.endOffset - functionCall.startOffset,
                        DIAGNOSTIC_SEVERITY_ERROR,
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
            const endOffset =
                providedArgument.endOffset >= 0
                    ? providedArgument.endOffset
                    : functionCall.startOffset + functionCall.name.length;

            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    startOffset,
                    endOffset - startOffset,
                    DIAGNOSTIC_SEVERITY_ERROR,
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
                document,
                documentText,
                startOffset,
                endOffset - startOffset,
                DIAGNOSTIC_SEVERITY_WARNING,
                `'${functionCall.name}' does not accept argument ${index + 1}`,
            ),
        );
    }
}

function hasValue(argument: ParsedArgument | undefined): argument is ParsedArgument {
    if (!argument) {
        return false;
    }

    if (argument.tokens.length === 0) {
        return false;
    }

    return argument.text.trim().length > 0;
}

function reportTemplateSyntaxIssues(
    documentText: string,
    document: BrowserTextDocument,
    diagnostics: LspDiagnostic[],
) {
    for (let index = 0; index < documentText.length; index++) {
        const character = documentText[index];

        if (character === "\\") {
            const nextCharacter = documentText[index + 1];

            if (!nextCharacter) {
                diagnostics.push(
                    createDiagnostic(
                        document,
                        documentText,
                        index,
                        1,
                        DIAGNOSTIC_SEVERITY_WARNING,
                        "Trailing escape character",
                    ),
                );
                continue;
            }

            if (!VALID_ESCAPES.has(nextCharacter)) {
                diagnostics.push(
                    createDiagnostic(
                        document,
                        documentText,
                        index,
                        2,
                        DIAGNOSTIC_SEVERITY_WARNING,
                        `Unknown escape sequence '\\${nextCharacter}'`,
                    ),
                );
            }

            index++;
            continue;
        }

        if (character !== "&") {
            continue;
        }

        const nextCharacter = documentText[index + 1];

        if (!nextCharacter) {
            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    index,
                    1,
                    DIAGNOSTIC_SEVERITY_WARNING,
                    "Dangling formatting marker '&'",
                ),
            );
            continue;
        }

        if (nextCharacter === "#") {
            const hexValue = documentText.slice(index + 2, index + 10);

            if (!/^[0-9A-Fa-f]{8}$/.test(hexValue)) {
                diagnostics.push(
                    createDiagnostic(
                        document,
                        documentText,
                        index,
                        Math.min(10, documentText.length - index),
                        DIAGNOSTIC_SEVERITY_ERROR,
                        "Hex color codes must use &#AARRGGBB",
                    ),
                );
                continue;
            }

            index += 9;
            continue;
        }

        if (!VALID_FORMATTING_CODES.has(nextCharacter)) {
            diagnostics.push(
                createDiagnostic(
                    document,
                    documentText,
                    index,
                    2,
                    DIAGNOSTIC_SEVERITY_WARNING,
                    `Unknown formatting code '&${nextCharacter}'`,
                ),
            );
            continue;
        }

        index++;
    }
}

function createDiagnostic(
    document: BrowserTextDocument,
    documentText: string,
    offset: number,
    length: number,
    severity: number,
    message: string,
): LspDiagnostic {
    const start = document.positionAt(offset);
    const safeLength = Math.max(length, 1);
    const end = document.positionAt(Math.min(offset + safeLength, documentText.length));

    return {
        range: { start, end },
        message,
        severity,
        source: "wynntils",
    };
}
