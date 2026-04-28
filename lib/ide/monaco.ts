import type { Monaco as MonacoApi } from "@monaco-editor/react";
import { WynntilsLspClient } from "@/lib/ide/lsp-client";
import {
    LspCompletionItem,
    LspHover,
    LspMarkupContent,
    LspMarkedString,
    LspRange,
    LspTextEdit,
} from "@/lib/ide/types";
import type { editor as MonacoEditor, languages as MonacoLanguages, Position as MonacoPosition } from "monaco-editor";

const WYNNTILS_LANGUAGE_ID = "wynntils";
const WYNNTILS_THEME_ID = "wynntils-dark";
let languageRegistered = false;

export const WYNNTILS_LANGUAGE = WYNNTILS_LANGUAGE_ID;
export const WYNNTILS_THEME = WYNNTILS_THEME_ID;

function defineWynntilsTheme(monaco: MonacoApi) {
    monaco.editor.defineTheme(WYNNTILS_THEME_ID, {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "comment", foreground: "708194", fontStyle: "italic" },
            { token: "keyword", foreground: "7dd3fc", fontStyle: "bold" },
            { token: "identifier", foreground: "dbeafe" },
            { token: "delimiter", foreground: "94a3b8" },
            { token: "delimiter.bracket", foreground: "facc15" },
            { token: "number", foreground: "a7f3d0" },
            { token: "number.hex", foreground: "86efac" },
            { token: "type.identifier", foreground: "2dd4bf" },
            { token: "string", foreground: "fdba74" },
            { token: "string.invalid", foreground: "f87171" },
            { token: "string.escape.invalid", foreground: "f87171", fontStyle: "bold" },
        ],
        colors: {
            "editor.background": "#101923",
            "editor.foreground": "#dbe7f3",
            "editorLineNumber.foreground": "#64748b",
            "editorLineNumber.activeForeground": "#cbd5e1",
            "editorCursor.foreground": "#7dd3fc",
            "editor.selectionBackground": "#24557a80",
            "editor.inactiveSelectionBackground": "#22384f80",
            "editor.lineHighlightBackground": "#172334",
            "editor.lineHighlightBorder": "#223247",
            "editorIndentGuide.background1": "#26384d",
            "editorIndentGuide.activeBackground1": "#3b82f6",
            "editorWhitespace.foreground": "#31435a",
            "editorWidget.background": "#111c28",
            "editorWidget.border": "#334155",
            "editorSuggestWidget.background": "#111c28",
            "editorSuggestWidget.border": "#334155",
            "editorSuggestWidget.foreground": "#dbe7f3",
            "editorSuggestWidget.selectedBackground": "#1e3a56",
            "editorSuggestWidget.highlightForeground": "#7dd3fc",
            "editorHoverWidget.background": "#111c28",
            "editorHoverWidget.border": "#334155",
            "editorOverviewRuler.border": "#101923",
            "scrollbarSlider.background": "#33415588",
            "scrollbarSlider.hoverBackground": "#475569aa",
            "scrollbarSlider.activeBackground": "#64748bcc",
        },
    });
}

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

function isEscapedCompletionContext(documentText: string, wordStartOffset: number) {
    return wordStartOffset > 0 && documentText[wordStartOffset - 1] === "\\";
}

function isPlaceholderCompletionContext(documentText: string, wordStartOffset: number) {
    const marker = documentText.slice(Math.max(0, wordStartOffset - 2), wordStartOffset);

    return marker === "@{" || marker === "${";
}

function isFormatSuffixCompletionContext(documentText: string, wordStartOffset: number) {
    const expressionStart = documentText.lastIndexOf("{", wordStartOffset);
    const expressionEnd = documentText.lastIndexOf("}", wordStartOffset);

    if (expressionStart < 0 || expressionStart < expressionEnd) {
        return false;
    }

    const expressionPrefix = documentText.slice(expressionStart + 1, wordStartOffset);
    const colonIndex = expressionPrefix.lastIndexOf(":");

    if (colonIndex < 0) {
        return false;
    }

    return /^[A-Za-z0-9]*$/.test(expressionPrefix.slice(colonIndex + 1));
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
    defineWynntilsTheme(monaco);

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
        triggerCharacters: ["{"],
        provideCompletionItems: async (
            model: MonacoEditor.ITextModel,
            position: MonacoPosition,
            context: MonacoLanguages.CompletionContext,
        ) => {
            const currentWord = model.getWordUntilPosition(position);
            const isExpressionStart = context.triggerCharacter === "{";
            const documentText = model.getValue();
            const wordStartOffset = model.getOffsetAt({
                lineNumber: position.lineNumber,
                column: currentWord.startColumn,
            });

            if (
                context.triggerCharacter === ";" ||
                context.triggerCharacter === "(" ||
                isEscapedCompletionContext(documentText, wordStartOffset) ||
                isPlaceholderCompletionContext(documentText, wordStartOffset) ||
                isFormatSuffixCompletionContext(documentText, wordStartOffset) ||
                (!isExpressionStart && currentWord.word.length === 0)
            ) {
                return { suggestions: [] };
            }

            const items = await lspClient.requestCompletion(
                model.uri.toString(),
                toLspPosition(position.lineNumber, position.column),
                context.triggerCharacter,
            );

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
                    sortText: item.sortText,
                })),
            };
        },
    });

    const hoverProvider = monaco.languages.registerHoverProvider(WYNNTILS_LANGUAGE_ID, {
        provideHover: async (model: MonacoEditor.ITextModel, position: MonacoPosition) => {
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
