import { isValueToken, lex, Token, TokenKind } from "@/lib/ide/browser-lsp/lexer";
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
    return findCallContext(document.getText(), document.offsetAt(position));
}

export function findFunctionIdentifierContext(document: BrowserTextDocument, position: LspPosition): CallContext | null {
    return findFunctionIdentifierCallContext(document.getText(), document.offsetAt(position));
}

export function findCallContext(text: string, offset: number): CallContext | null {
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

    return callStack[callStack.length - 1] ?? null;
}

function findFunctionIdentifierCallContext(text: string, offset: number): CallContext | null {
    const safeOffset = Math.max(0, Math.min(offset, text.length));
    const tokens = lex(text);

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        const nextToken = tokens[index + 1];

        if (!isFunctionCallStart(token, nextToken) || !nextToken) {
            continue;
        }

        const tokenEndOffset = token.offset + token.length;
        const cursorIsOnIdentifier = safeOffset >= token.offset && safeOffset <= tokenEndOffset;

        if (!cursorIsOnIdentifier) {
            continue;
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

function isFunctionCallStart(
    token: Token,
    nextToken: Token | undefined,
): token is Token & { kind: TokenKind.Identifier; value: string } {
    return isValueToken(token) && token.kind === TokenKind.Identifier && nextToken?.kind === TokenKind.LeftParenthesis;
}
