import type { Monaco as MonacoApi } from "@monaco-editor/react";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";

const WYNNTILS_LANGUAGE_ID = "wynntils";
let languageRegistered = false;

export const WYNNTILS_LANGUAGE = WYNNTILS_LANGUAGE_ID;

export function ensureWynntilsLanguage(monaco: MonacoApi) {
    if (languageRegistered) {
        return;
    }

    languageRegistered = true;

    monaco.languages.register({ id: WYNNTILS_LANGUAGE_ID });

    monaco.languages.setLanguageConfiguration(WYNNTILS_LANGUAGE_ID, {
        comments: {
            lineComment: "//",
        },
        brackets: [
            ["(", ")"],
            ["{", "}"],
            ["[", "]"],
        ],
        autoClosingPairs: [
            { open: "(", close: ")" },
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: '"', close: '"' },
        ],
        surroundingPairs: [
            { open: "(", close: ")" },
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: '"', close: '"' },
        ],
    });

    monaco.languages.setMonarchTokensProvider(WYNNTILS_LANGUAGE_ID, {
        tokenizer: {
            root: [
                [/\/\/.*/, "comment"],
                [/\b(let|true|false)\b/, "keyword"],
                [/[a-zA-Z_][\w]*/, "identifier"],
                [/[{}()\[\]]/, "delimiter.bracket"],
                [/;/, "delimiter"],
                [/[0-9]+(\.[0-9]+)?/, "number"],
                [/@\{[A-Za-z_][A-Za-z0-9_]*\}/, "type.identifier"],
                [/\$\{[A-Za-z_][A-Za-z0-9_]*\}/, "type.identifier"],
                [/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/, "number.hex"],
                [/"([^"\\]|\\.)*$/, "string.invalid"],
                [/"/, "string", "@string"],
            ],
            string: [
                [/[^\\"]+/, "string"],
                [/\\./, "string.escape.invalid"],
                [/"/, "string", "@pop"],
            ],
        },
    });
}

export function registerWynntilsProviders(monaco: MonacoApi, lspClient: WynntilsLspClient) {
    const completionProvider = monaco.languages.registerCompletionItemProvider(WYNNTILS_LANGUAGE_ID, {
        triggerCharacters: ["{", "(", ";"],
        provideCompletionItems: async (model, position) => {
            const items = await lspClient.getCompletionItems(model.getValue());
            const currentWord = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: currentWord.startColumn,
                endColumn: currentWord.endColumn,
            };

            return {
                suggestions: items.map((item) => ({
                    label: item.label,
                    kind: monaco.languages.CompletionItemKind.Function,
                    detail: item.detail,
                    insertText: item.insertText,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range,
                })),
            };
        },
    });

    const hoverProvider = monaco.languages.registerHoverProvider(WYNNTILS_LANGUAGE_ID, {
        provideHover: async (model, position) => {
            const offset = model.getOffsetAt(position);
            const hover = await lspClient.getHover(model.getValue(), offset);

            if (!hover) {
                return null;
            }

            return {
                contents: [{ value: hover.markdown }],
            };
        },
    });

    return [completionProvider, hoverProvider];
}
