// Adapted from DevChromium/wynntils-functions-tools (MIT License).

import { Token, TokenKind, ValueToken, isValueToken, lex } from "@/lib/ide/lsp-core/lexer";

export interface FunctionCall {
    name: string;
    arguments: ParsedArgument[];
    startOffset: number;
    endOffset: number;
}

export interface ParsedArgument {
    text: string;
    startOffset: number;
    endOffset: number;
    tokens: Token[];
}

export interface ParseError {
    offset: number;
    length: number;
    message: string;
}

export interface ParseResult {
    calls: FunctionCall[];
    errors: ParseError[];
}

export function parse(sourceText: string): ParseResult {
    const tokens = lex(sourceText);
    const functionCalls: FunctionCall[] = [];
    const parseErrors: ParseError[] = [];
    const openingBraces: Array<{ offset: number; length: number }> = [];

    for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
        const token = tokens[tokenIndex];

        switch (token.kind) {
            case TokenKind.LeftBrace:
                openingBraces.push({ offset: token.offset, length: token.length });
                break;

            case TokenKind.RightBrace: {
                if (openingBraces.length === 0) {
                    parseErrors.push({ offset: token.offset, length: token.length, message: "Unmatched }" });
                } else {
                    openingBraces.pop();
                }
                break;
            }

            case TokenKind.Identifier: {
                if (!isValueToken(token)) {
                    break;
                }

                const identifierToken: ValueToken = token;
                const nextToken = tokens[tokenIndex + 1];

                if (!nextToken || nextToken.kind !== TokenKind.LeftParenthesis) {
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
                });

                tokenIndex = searchIndex;
                break;
            }

            default:
                break;
        }
    }

    while (openingBraces.length > 0) {
        const unmatchedBrace = openingBraces.pop();

        if (!unmatchedBrace) {
            break;
        }

        parseErrors.push({ offset: unmatchedBrace.offset, length: unmatchedBrace.length, message: "Unmatched {" });
    }

    return { calls: functionCalls, errors: parseErrors };
}

function collectArgumentTokens(tokens: Token[], startIndex: number, endIndex: number): Token[][] {
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
