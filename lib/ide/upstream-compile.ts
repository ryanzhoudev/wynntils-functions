// Adapted from DevChromium/wynntils-functions-tools/src/compile.ts (MIT License).

import { CompileResult } from "@/lib/ide/types";

const PLACEHOLDER_PATTERN = /[@$]\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

type VariableInfo = {
    rawValue: string;
    valueOffset: number;
    declarationOffset: number;
};

type VariableDeclaration = {
    name: string;
    rawValue: string;
    declarationOffset: number;
    valueOffset: number;
    endOffset: number;
};

export function compileSupersetToWynntils(sourceText: string): CompileResult {
    const errors: { off: number; msg: string }[] = [];
    const variables = new Map<string, VariableInfo>();

    const declarations = extractVariableDeclarations(sourceText);
    const codeWithoutDeclarations = removeVariableDeclarations(sourceText, declarations);

    for (const declaration of declarations) {
        if (variables.has(declaration.name)) {
            errors.push({ off: declaration.declarationOffset, msg: `Duplicate variable '${declaration.name}'` });
            continue;
        }

        variables.set(declaration.name, {
            rawValue: declaration.rawValue,
            valueOffset: declaration.valueOffset,
            declarationOffset: declaration.declarationOffset,
        });
    }

    const resolvedValues = resolveVariables(variables, errors);

    const substitutedCode = replacePlaceholders(codeWithoutDeclarations, (variableName, placeholderOffset) => {
        const resolvedValue = resolvedValues.get(variableName);
        if (resolvedValue === undefined) {
            errors.push({ off: placeholderOffset, msg: `Undefined variable '${variableName}'` });
            return null;
        }
        return resolvedValue;
    });

    const normalizedCode = normalizeCompiledCode(substitutedCode);

    return { code: normalizedCode, errors };
}

function resolveVariables(
    variables: Map<string, VariableInfo>,
    errors: {
        off: number;
        msg: string;
    }[],
): Map<string, string> {
    const resolvedValues = new Map<string, string>();
    const resolutionStack = new Set<string>();

    const resolve = (variableName: string): string | undefined => {
        if (resolvedValues.has(variableName)) {
            return resolvedValues.get(variableName)!;
        }

        const variableInfo = variables.get(variableName);
        if (!variableInfo) {
            return undefined;
        }

        if (resolutionStack.has(variableName)) {
            errors.push({
                off: variableInfo.declarationOffset,
                msg: `Circular variable reference involving '${variableName}'`,
            });
            return undefined;
        }

        resolutionStack.add(variableName);

        const resolvedText = replacePlaceholders(
            variableInfo.rawValue,
            (innerName, placeholderOffset) => {
                const innerResolved = resolve(innerName);
                if (innerResolved === undefined) {
                    errors.push({ off: placeholderOffset, msg: `Undefined variable '${innerName}'` });
                    return null;
                }
                return innerResolved;
            },
            variableInfo.valueOffset,
        ).trim();

        resolutionStack.delete(variableName);
        resolvedValues.set(variableName, resolvedText);
        return resolvedText;
    };

    for (const variableName of Array.from(variables.keys())) {
        resolve(variableName);
    }

    return resolvedValues;
}

function replacePlaceholders(
    text: string,
    resolver: (variableName: string, placeholderOffset: number) => string | null,
    baseOffset = 0,
): string {
    let result = "";
    let lastIndex = 0;
    PLACEHOLDER_PATTERN.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PLACEHOLDER_PATTERN.exec(text)) !== null) {
        const placeholderStart = match.index;
        const placeholderEnd = placeholderStart + match[0].length;
        const variableName = match[1];
        const placeholderOffset = baseOffset + placeholderStart;

        result += text.slice(lastIndex, placeholderStart);

        const resolved = resolver(variableName, placeholderOffset);
        if (resolved === null) {
            result += match[0];
        } else {
            result += resolved;
        }

        lastIndex = placeholderEnd;
    }

    result += text.slice(lastIndex);
    return result;
}

function normalizeCompiledCode(compiledCode: string): string {
    const withoutCarriageReturns = compiledCode.replace(/\r/g, "");
    const withoutNewlines = withoutCarriageReturns.replace(/\n+/g, "");
    return withoutNewlines.trim();
}

function extractVariableDeclarations(sourceText: string): VariableDeclaration[] {
    const declarations: VariableDeclaration[] = [];
    const length = sourceText.length;
    let index = 0;

    while (index < length) {
        const char = sourceText[index];

        if (char === "/" && sourceText[index + 1] === "/") {
            while (index < length && sourceText[index] !== "\n") {
                index++;
            }
            continue;
        }

        if (isWhitespace(char)) {
            index++;
            continue;
        }

        if (isLetKeyword(sourceText, index)) {
            const declarationStart = index;
            index += 3;

            while (index < length && isWhitespace(sourceText[index])) {
                index++;
            }

            if (index >= length || !isIdentifierStart(sourceText[index])) {
                continue;
            }

            const nameStart = index;
            index++;
            while (index < length && isIdentifierPart(sourceText[index])) {
                index++;
            }
            const name = sourceText.slice(nameStart, index);

            while (index < length && isWhitespace(sourceText[index])) {
                index++;
            }

            if (sourceText[index] !== "=") {
                continue;
            }
            index++;

            while (index < length && isWhitespace(sourceText[index])) {
                index++;
            }

            const valueStart = index;
            const { valueEnd, rawValue } = readExpressionUntilSemicolon(sourceText, index);

            if (valueEnd === -1) {
                continue;
            }

            declarations.push({
                name,
                rawValue,
                declarationOffset: declarationStart,
                valueOffset: valueStart,
                endOffset: valueEnd,
            });

            index = valueEnd;
            continue;
        }

        index++;
    }

    return declarations.sort((a, b) => a.declarationOffset - b.declarationOffset);
}

function removeVariableDeclarations(sourceText: string, declarations: VariableDeclaration[]): string {
    if (declarations.length === 0) {
        return sourceText;
    }

    let result = "";
    let lastIndex = 0;

    for (const declaration of declarations) {
        result += sourceText.slice(lastIndex, declaration.declarationOffset);
        lastIndex = declaration.endOffset;
    }

    result += sourceText.slice(lastIndex);
    return result;
}

function readExpressionUntilSemicolon(sourceText: string, startIndex: number): { valueEnd: number; rawValue: string } {
    const length = sourceText.length;
    let index = startIndex;
    let depthParenthesis = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let inString = false;
    let stringDelimiter = "";

    while (index < length) {
        const char = sourceText[index];

        if (inString) {
            if (char === "\\" && index + 1 < length) {
                index += 2;
                continue;
            }

            if (char === stringDelimiter) {
                inString = false;
                stringDelimiter = "";
            }

            index++;
            continue;
        }

        if (char === '"' || char === "'") {
            inString = true;
            stringDelimiter = char;
            index++;
            continue;
        }

        switch (char) {
            case "(":
                depthParenthesis++;
                break;
            case ")":
                if (depthParenthesis > 0) depthParenthesis--;
                break;
            case "{":
                depthBrace++;
                break;
            case "}":
                if (depthBrace > 0) depthBrace--;
                break;
            case "[":
                depthBracket++;
                break;
            case "]":
                if (depthBracket > 0) depthBracket--;
                break;
            case ";":
                if (depthParenthesis === 0 && depthBrace === 0 && depthBracket === 0) {
                    return { valueEnd: index + 1, rawValue: sourceText.slice(startIndex, index) };
                }
                break;
        }

        index++;
    }

    return { valueEnd: -1, rawValue: "" };
}

function isIdentifierStart(char: string | undefined): boolean {
    return char !== undefined && /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string | undefined): boolean {
    return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function isWhitespace(char: string | undefined): boolean {
    return char !== undefined && /\s/.test(char);
}

function isLetKeyword(sourceText: string, index: number): boolean {
    if (!sourceText.startsWith("let", index)) {
        return false;
    }

    const before = index === 0 ? "" : sourceText[index - 1];
    const after = sourceText[index + 3];

    const isStartBoundary = before === "" || before === "\n" || before === "\r" || /\s/.test(before);
    const isEndBoundary = !isIdentifierPart(after);

    return isStartBoundary && isEndBoundary;
}
