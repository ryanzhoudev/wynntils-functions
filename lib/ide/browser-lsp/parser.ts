import { isValueToken, lex, Token, TokenKind, ValueToken } from "@/lib/ide/browser-lsp/lexer";

export type FunctionCall = {
    name: string;
    arguments: ParsedArgument[];
    startOffset: number;
    endOffset: number;
    hasArgumentList: boolean;
    isBareExpression: boolean;
    formatSuffix?: FormatSuffix;
};

export type FormatSuffix = {
    text: string;
    startOffset: number;
    endOffset: number;
    formatted: boolean;
    decimals?: number;
    isValid: boolean;
    error?: string;
};

export type ParsedArgument = {
    text: string;
    startOffset: number;
    endOffset: number;
    tokens: Token[];
};

export type ParseError = {
    offset: number;
    length: number;
    message: string;
};

export type ParseResult = {
    calls: FunctionCall[];
    errors: ParseError[];
};

export function parse(sourceText: string): ParseResult {
    const tokens = lex(sourceText);
    const functionCalls: FunctionCall[] = [];
    const parseErrors: ParseError[] = [];
    const openingBraces: Array<{ offset: number; length: number }> = [];
    const expressionRanges: Array<{ startOffset: number; endOffset: number }> = [];
    const formatSuffixRanges: Array<{ startOffset: number; endOffset: number }> = [];

    for (const token of tokens) {
        switch (token.kind) {
            case TokenKind.LeftBrace:
                openingBraces.push({ offset: token.offset, length: token.length });
                break;

            case TokenKind.RightBrace:
                if (openingBraces.length === 0) {
                    parseErrors.push({ offset: token.offset, length: token.length, message: "Unmatched }" });
                } else {
                    const openingBrace = openingBraces.pop()!;

                    if (openingBraces.length === 0) {
                        expressionRanges.push({
                            startOffset: openingBrace.offset,
                            endOffset: token.offset + token.length,
                        });
                    }
                }
                break;

            default:
                break;
        }
    }

    while (openingBraces.length > 0) {
        const unmatchedBrace = openingBraces.pop()!;
        parseErrors.push({ offset: unmatchedBrace.offset, length: unmatchedBrace.length, message: "Unmatched {" });
    }

    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
        const token = tokens[tokenIndex];

        switch (token.kind) {
            case TokenKind.Identifier: {
                if (!isValueToken(token)) {
                    break;
                }

                const identifierToken: ValueToken = token;

                if (isInsideRange(identifierToken.offset, formatSuffixRanges)) {
                    break;
                }

                const nextToken = tokens[tokenIndex + 1];
                const expressionRange = findContainingExpressionRange(identifierToken, expressionRanges);

                if (!nextToken || nextToken.kind !== TokenKind.LeftParenthesis) {
                    if (expressionRange) {
                        const callEndOffset = identifierToken.offset + identifierToken.length;
                        const formatSuffix = parseFormatSuffix(tokens, tokenIndex + 1, sourceText);

                        functionCalls.push({
                            name: identifierToken.value,
                            arguments: [],
                            startOffset: identifierToken.offset,
                            endOffset: formatSuffix?.endOffset ?? callEndOffset,
                            hasArgumentList: false,
                            isBareExpression: true,
                            formatSuffix,
                        });

                        if (formatSuffix) {
                            formatSuffixRanges.push({
                                startOffset: formatSuffix.startOffset,
                                endOffset: formatSuffix.endOffset,
                            });
                        }
                    }

                    break;
                }

                const callStartOffset = identifierToken.offset;
                let searchIndex = tokenIndex + 2;
                let openParenthesesDepth = 1;
                let closingParenthesisToken: Token | undefined;
                let closingParenthesisIndex = -1;

                while (searchIndex < tokens.length) {
                    const currentToken = tokens[searchIndex];

                    if (currentToken.kind === TokenKind.LeftParenthesis) {
                        openParenthesesDepth++;
                    } else if (currentToken.kind === TokenKind.RightParenthesis) {
                        openParenthesesDepth--;

                        if (openParenthesesDepth === 0) {
                            closingParenthesisToken = currentToken;
                            closingParenthesisIndex = searchIndex;
                            break;
                        }
                    }

                    searchIndex++;
                }

                if (!closingParenthesisToken) {
                    parseErrors.push({
                        offset: callStartOffset,
                        length: identifierToken.length,
                        message: `Missing ')' for ${identifierToken.value}`,
                    });
                    tokenIndex = searchIndex - 1;
                    break;
                }

                const argumentTokens = collectArgumentTokens(tokens, tokenIndex + 2, closingParenthesisIndex);
                const parsedArguments = buildParsedArguments(argumentTokens, sourceText);
                const callEndOffset = closingParenthesisToken.offset + closingParenthesisToken.length;
                const formatSuffix = parseFormatSuffix(tokens, closingParenthesisIndex + 1, sourceText);

                functionCalls.push({
                    name: identifierToken.value,
                    arguments: parsedArguments,
                    startOffset: callStartOffset,
                    endOffset: formatSuffix?.endOffset ?? callEndOffset,
                    hasArgumentList: true,
                    isBareExpression: false,
                    formatSuffix,
                });

                if (formatSuffix) {
                    formatSuffixRanges.push({
                        startOffset: formatSuffix.startOffset,
                        endOffset: formatSuffix.endOffset,
                    });
                }
                break;
            }

            default:
                break;
        }
    }

    return { calls: functionCalls, errors: parseErrors };
}

function isInsideRange(offset: number, ranges: Array<{ startOffset: number; endOffset: number }>) {
    return ranges.some((range) => offset >= range.startOffset && offset < range.endOffset);
}

function parseFormatSuffix(tokens: Token[], nextTokenIndex: number, sourceText: string): FormatSuffix | undefined {
    const colonToken = tokens[nextTokenIndex];

    if (!colonToken || colonToken.kind !== TokenKind.Colon) {
        return undefined;
    }

    const suffixTokens: Token[] = [colonToken];
    let cursor = nextTokenIndex + 1;

    while (cursor < tokens.length && isFormatSuffixToken(tokens[cursor])) {
        suffixTokens.push(tokens[cursor]);
        cursor++;
    }

    const lastToken = suffixTokens[suffixTokens.length - 1];
    const startOffset = colonToken.offset;
    const endOffset = lastToken.offset + lastToken.length;
    const text = sourceText.slice(startOffset, endOffset);
    const match = /^:(F)?([0-9]+)?$/.exec(text);

    if (!match || (!match[1] && !match[2])) {
        return {
            text,
            startOffset,
            endOffset,
            formatted: false,
            isValid: false,
            error: "Invalid format suffix. Use :F, :2, or :F2.",
        };
    }

    return {
        text,
        startOffset,
        endOffset,
        formatted: Boolean(match[1]),
        decimals: match[2] ? Number.parseInt(match[2], 10) : undefined,
        isValid: true,
    };
}

function isFormatSuffixToken(token: Token) {
    if (!isValueToken(token)) {
        return false;
    }

    if (token.kind === TokenKind.Identifier) {
        return /^[A-Za-z]+$/.test(token.value);
    }

    if (token.kind === TokenKind.Number) {
        return /^[0-9]+$/.test(token.value);
    }

    return false;
}

function findContainingExpressionRange(identifierToken: ValueToken, expressionRanges: Array<{ startOffset: number; endOffset: number }>) {
    const tokenEndOffset = identifierToken.offset + identifierToken.length;

    return expressionRanges.find((range) => {
        return identifierToken.offset > range.startOffset && tokenEndOffset < range.endOffset;
    });
}

function collectArgumentTokens(tokens: Token[], startIndex: number, endIndex: number) {
    const argumentTokens: Token[][] = [];
    let currentTokens: Token[] = [];
    let nestingDepth = 1;

    for (let index = startIndex; index < endIndex; index++) {
        const token = tokens[index];

        if (nestingDepth === 1 && token.kind === TokenKind.Semicolon) {
            argumentTokens.push(currentTokens);
            currentTokens = [];
            continue;
        }

        currentTokens.push(token);

        if (token.kind === TokenKind.LeftParenthesis) {
            nestingDepth++;
        } else if (token.kind === TokenKind.RightParenthesis) {
            nestingDepth--;
        }
    }

    argumentTokens.push(currentTokens);

    return argumentTokens;
}

function buildParsedArguments(argumentTokens: Token[][], sourceText: string): ParsedArgument[] {
    return argumentTokens.map((tokens) => {
        if (tokens.length === 0) {
            return {
                text: "",
                startOffset: -1,
                endOffset: -1,
                tokens,
            };
        }

        const startOffset = tokens[0].offset;
        const lastToken = tokens[tokens.length - 1];
        const endOffset = lastToken.offset + lastToken.length;
        const text = sourceText.slice(startOffset, endOffset).trim();

        return {
            text,
            startOffset,
            endOffset,
            tokens,
        };
    });
}
