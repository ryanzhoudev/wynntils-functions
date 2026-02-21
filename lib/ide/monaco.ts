import type { Monaco as MonacoApi } from "@monaco-editor/react";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import { LspCompletionItem, LspHover, LspMarkupContent, LspMarkedString, LspRange, LspTextEdit } from "@/lib/ide/types";

const WYNNTILS_LANGUAGE_ID = "wynntils";
let languageRegistered = false;

export const WYNNTILS_LANGUAGE = WYNNTILS_LANGUAGE_ID;

function toLspPosition(lineNumber: number, column: number) {
    return {
        line: lineNumber - 1,
        character: column - 1,
    };
}

function fromLspRange(range: LspRange) {
    return {
        startLineNumber: range.start.line + 1,
        startColumn: range.start.character + 1,
        endLineNumber: range.end.line + 1,
        endColumn: range.end.character + 1,
    };
}

function toMarkdownStrings(contents: LspHover["contents"]) {
    if (typeof contents === "string") {
        return [{ value: contents }];
    }

    if (Array.isArray(contents)) {
        return contents.map((entry) => {
            if (typeof entry === "string") {
                return { value: entry };
            }

            const marked = entry as Exclude<LspMarkedString, string>;

            return {
                value: `\`\`\`${marked.language}\n${marked.value}\n\`\`\``,
            };
        });
    }

    const markup = contents as LspMarkupContent;

    return [{ value: markup.value }];
}

function mapCompletionItemKind(monaco: MonacoApi, kind?: number) {
    switch (kind) {
        case 1:
            return monaco.languages.CompletionItemKind.Text;
        case 2:
            return monaco.languages.CompletionItemKind.Method;
        case 3:
            return monaco.languages.CompletionItemKind.Function;
        case 4:
            return monaco.languages.CompletionItemKind.Constructor;
        case 5:
            return monaco.languages.CompletionItemKind.Field;
        case 6:
            return monaco.languages.CompletionItemKind.Variable;
        case 7:
            return monaco.languages.CompletionItemKind.Class;
        case 8:
            return monaco.languages.CompletionItemKind.Interface;
        case 9:
            return monaco.languages.CompletionItemKind.Module;
        case 10:
            return monaco.languages.CompletionItemKind.Property;
        case 11:
            return monaco.languages.CompletionItemKind.Unit;
        case 12:
            return monaco.languages.CompletionItemKind.Value;
        case 13:
            return monaco.languages.CompletionItemKind.Enum;
        case 14:
            return monaco.languages.CompletionItemKind.Keyword;
        case 15:
            return monaco.languages.CompletionItemKind.Snippet;
        case 16:
            return monaco.languages.CompletionItemKind.Color;
        case 17:
            return monaco.languages.CompletionItemKind.File;
        case 18:
            return monaco.languages.CompletionItemKind.Reference;
        case 19:
            return monaco.languages.CompletionItemKind.Folder;
        case 20:
            return monaco.languages.CompletionItemKind.EnumMember;
        case 21:
            return monaco.languages.CompletionItemKind.Constant;
        case 22:
            return monaco.languages.CompletionItemKind.Struct;
        case 23:
            return monaco.languages.CompletionItemKind.Event;
        case 24:
            return monaco.languages.CompletionItemKind.Operator;
        case 25:
            return monaco.languages.CompletionItemKind.TypeParameter;
        default:
            return monaco.languages.CompletionItemKind.Function;
    }
}

function resolveInsertText(item: LspCompletionItem) {
    if (item.textEdit && typeof item.textEdit.newText === "string") {
        return item.textEdit.newText;
    }

    if (typeof item.insertText === "string") {
        return item.insertText;
    }

    return item.label;
}

function resolveRange(
    item: LspCompletionItem,
    fallbackRange: {
        startLineNumber: number;
        endLineNumber: number;
        startColumn: number;
        endColumn: number;
    },
) {
    const textEdit = item.textEdit as LspTextEdit | undefined;

    if (!textEdit?.range) {
        return fallbackRange;
    }

    return fromLspRange(textEdit.range);
}

function resolveDocumentation(item: LspCompletionItem): string | undefined {
    const documentation = item.documentation;

    if (!documentation) {
        return undefined;
    }

    if (typeof documentation === "string") {
        return documentation;
    }

    if (Array.isArray(documentation)) {
        return documentation
            .map((entry) => {
                if (typeof entry === "string") {
                    return entry;
                }

                return `\`\`\`${entry.language}\n${entry.value}\n\`\`\``;
            })
            .join("\n\n");
    }

    return documentation.value;
}

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
            const items = await lspClient.requestCompletion(model.uri.toString(), toLspPosition(position.lineNumber, position.column));

            const currentWord = model.getWordUntilPosition(position);
            const fallbackRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: currentWord.startColumn,
                endColumn: currentWord.endColumn,
            };

            return {
                suggestions: items.map((item) => ({
                    label: item.label,
                    kind: mapCompletionItemKind(monaco, item.kind),
                    detail: item.detail,
                    documentation: resolveDocumentation(item),
                    insertText: resolveInsertText(item),
                    insertTextRules:
                        item.insertTextFormat === 2
                            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                            : monaco.languages.CompletionItemInsertTextRule.None,
                    range: resolveRange(item, fallbackRange),
                })),
            };
        },
    });

    const hoverProvider = monaco.languages.registerHoverProvider(WYNNTILS_LANGUAGE_ID, {
        provideHover: async (model, position) => {
            const hover = await lspClient.requestHover(model.uri.toString(), toLspPosition(position.lineNumber, position.column));

            if (!hover) {
                return null;
            }

            return {
                contents: toMarkdownStrings(hover.contents),
                range: hover.range ? fromLspRange(hover.range) : undefined,
            };
        },
    });

    return [completionProvider, hoverProvider];
}
