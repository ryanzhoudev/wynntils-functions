import { isValueToken, lex, Token, TokenKind, ValueToken } from "@/lib/ide/browser-lsp/lexer";

export type FunctionCall = {
    name: string;
    arguments: ParsedArgument[];
    startOffset: number;
    endOffset: number;
    hasArgumentList: boolean;
    isBareExpression: boolean;
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
                const nextToken = tokens[tokenIndex + 1];
                const expressionRange = findContainingExpressionRange(identifierToken, expressionRanges);

                if (!nextToken || nextToken.kind !== TokenKind.LeftParenthesis) {
                    if (expressionRange) {
                        functionCalls.push({
                            name: identifierToken.value,
                            arguments: [],
                            startOffset: identifierToken.offset,
                            endOffset: identifierToken.offset + identifierToken.length,
                            hasArgumentList: false,
                            isBareExpression: true,
                        });
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

                functionCalls.push({
                    name: identifierToken.value,
                    arguments: parsedArguments,
                    startOffset: callStartOffset,
                    endOffset: callEndOffset,
                    hasArgumentList: true,
                    isBareExpression: false,
                });
                break;
            }

            default:
                break;
        }
    }

    return { calls: functionCalls, errors: parseErrors };
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
