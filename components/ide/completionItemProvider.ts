import { wynntilsargument, wynntilsfunction } from "@prisma/client";
import { languages } from "monaco-editor";
import CompletionItemProvider = languages.CompletionItemProvider;

export default function completionItemProvider(
    monaco: typeof import("monaco-editor"),
    functions: wynntilsfunction[],
    args: wynntilsargument[],
): CompletionItemProvider {
    return {
        triggerCharacters: ["(", ";", "Tab"],
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const textUntilNow = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            const outerMatch = /([a-zA-Z_]\w*)\(([^)]*)$/.exec(textUntilNow);
            let expectedReturnType: string | null = null;

            if (outerMatch) {
                const outerFn = functions.find((f) => f.name === outerMatch[1]);
                if (outerFn) {
                    const paramCount = outerMatch[2].split(";").length - 1;
                    const paramArg = args.filter((a) => a.functionid === outerFn.id)[paramCount];
                    expectedReturnType = paramArg?.type ?? null;
                }
            }

            let suggestions = functions.map((fn) => ({
                label: fn.name,
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: `${fn.name}($0)`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: {
                    value: `**Returns**: \`${fn.returntype}\`\n\n${fn.description}`,
                },
                range,
            }));

            if (expectedReturnType) {
                suggestions = suggestions.filter((s) => s.documentation?.value.includes(`\`${expectedReturnType}\``));
            }

            return { suggestions };
        },
    };
}
