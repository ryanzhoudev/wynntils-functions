import { isValueToken, lex, Token, TokenKind } from "@/lib/ide/browser-lsp/lexer";
import { parse } from "@/lib/ide/browser-lsp/parser";
import { BrowserTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { LspPosition } from "@/lib/ide/types";

export type CallContext = {
    functionName: string;
    activeParameter: number;
    openParenthesisOffset: number;
    argumentStartOffset: number;
};

type CallFrame = CallContext;

export function findActiveCallContext(document: BrowserTextDocument, position: LspPosition): CallContext | null {
    return findCallContextStack(document.getText(), document.offsetAt(position)).at(-1) ?? null;
}

export function findFunctionIdentifierContext(document: BrowserTextDocument, position: LspPosition): CallContext | null {
    return findFunctionIdentifierCallContext(document.getText(), document.offsetAt(position));
}

export function findCallContext(text: string, offset: number): CallContext | null {
    return findCallContextStack(text, offset).at(-1) ?? null;
}

export function findCallContextStack(text: string, offset: number): CallContext[] {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const identifierContext = findFunctionIdentifierCallContext(text, safeOffset);

    if (identifierContext) {
        return [...buildCallStack(text, identifierContext.openParenthesisOffset - identifierContext.functionName.length), identifierContext];
    }

    return buildCallStack(text, safeOffset);
}

function buildCallStack(text: string, offset: number): CallContext[] {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const tokens = lex(text).filter((token) => token.offset < safeOffset);
    const callStack: CallFrame[] = [];

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const nextToken = tokens[index + 1];

        if (isFunctionCallStart(token, nextToken) && nextToken) {
            const openParenthesisToken = nextToken;

            callStack.push({
                functionName: token.value,
                activeParameter: 0,
                openParenthesisOffset: openParenthesisToken.offset,
                argumentStartOffset: openParenthesisToken.offset + openParenthesisToken.length,
            });
            index++;
            continue;
        }

        if (token.kind === TokenKind.RightParenthesis) {
            callStack.pop();
            continue;
        }

        if (token.kind === TokenKind.Semicolon) {
            const activeCall = callStack[callStack.length - 1];

            if (activeCall) {
                activeCall.activeParameter++;
                activeCall.argumentStartOffset = token.offset + token.length;
            }
        }
    }

    return callStack;
}

function findFunctionIdentifierCallContext(text: string, offset: number): CallContext | null {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const tokens = lex(text);
    const bareCalls = parse(text).calls.filter((call) => !call.hasArgumentList);

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const nextToken = tokens[index + 1];

        if (!isIdentifierToken(token)) {
            continue;
        }

        const tokenEndOffset = token.offset + token.length;
        const cursorIsOnIdentifier = safeOffset >= token.offset && safeOffset <= tokenEndOffset;

        if (!cursorIsOnIdentifier) {
            continue;
        }

        if (nextToken?.kind !== TokenKind.LeftParenthesis) {
            const bareCall = bareCalls.find((call) => call.startOffset === token.offset);

            if (!bareCall) {
                continue;
            }

            return {
                functionName: token.value,
                activeParameter: 0,
                openParenthesisOffset: tokenEndOffset,
                argumentStartOffset: tokenEndOffset,
            };
        }

        return {
            functionName: token.value,
            activeParameter: 0,
            openParenthesisOffset: nextToken.offset,
            argumentStartOffset: nextToken.offset + nextToken.length,
        };
    }

    return null;
}

function isIdentifierToken(token: Token): token is Token & { kind: TokenKind.Identifier; value: string } {
    return isValueToken(token) && token.kind === TokenKind.Identifier;
}

function isFunctionCallStart(
    token: Token,
    nextToken: Token | undefined,
): token is Token & { kind: TokenKind.Identifier; value: string } {
    return isIdentifierToken(token) && nextToken?.kind === TokenKind.LeftParenthesis;
}
