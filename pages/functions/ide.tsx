"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useState } from "react";

export default function FunctionIDE() {
    const monaco = useMonaco();
    const [functions, setFunctions] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/functions")
            .then((res) => res.json())
            .then((data) => setFunctions(data));
    }, []);

    useEffect(() => {
        if (!monaco || functions.length === 0) return;

        monaco.languages.register({ id: "wynntils" });

        monaco.languages.setMonarchTokensProvider("wynntils", {
            tokenizer: {
                root: [
                    [/\b(if|else|while|return)\b/, "keyword"],
                    [/[a-zA-Z_]\w*/, "identifier"],
                    [/\d+/, "number"],
                    [/\/\/.*/, "comment"],
                ],
            },
        });

        monaco.languages.registerCompletionItemProvider("wynntils", {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn,
                };

                const suggestions = functions.map((fn) => ({
                    label: fn.name,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: `${fn.name}()`,
                    documentation: fn.description,
                    range,
                }));

                return { suggestions };
            },
        });
    }, [monaco, functions]);

    return (
        <div className="h-screen w-full bg-gray-800">
            <Editor
                height="100%"
                defaultLanguage="wynntils"
                defaultValue="// Start typing a function..."
                theme="vs-dark"
                options={{ fontSize: 14, minimap: { enabled: false } }}
            />
        </div>
    );
}
