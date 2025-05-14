"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { functions, arguments as argumentsTable } from "@prisma/client";

export default function FunctionIDE() {
    const monaco = useMonaco();
    const [functions, setFunctions] = useState<functions[]>([]);
    const [args, setArgs] = useState<argumentsTable[]>([]);

    useEffect(() => {
        fetch("/api/functions")
            .then((res) => res.json())
            .then(({ functions, args }) => {
                setFunctions(functions);
                setArgs(args);
            });
    }, []);

    useEffect(() => {
        if (!monaco || functions.length === 0) return;

        monaco.languages.register({ id: "wynntils" });

        monaco.languages.setMonarchTokensProvider("wynntils", {
            tokenizer: {
                root: [[/\d+/, "number"]],
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

                const suggestions = functions.map((fn) => {
                    return {
                        label: fn.name,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${fn.name}($0)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: {
                            value: `**Returns**: \`${fn.returntype}\`\n\n${fn.description}`,
                        },
                        range,
                    };
                });

                return { suggestions };
            },
        });

        monaco.languages.registerSignatureHelpProvider("wynntils", {
            signatureHelpTriggerCharacters: ["("],
            signatureHelpRetriggerCharacters: [";"],
            provideSignatureHelp: (model, position) => {
                const textUntilNow = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                });

                const match = /([a-zA-Z_]\w*)\s*\([^()]*/.exec(textUntilNow);
                const fnName = match?.[1];
                const fn = functions.find((f) => f.name === fnName);
                if (!fn)
                    return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose: () => {} };

                const fnArgs = args.filter((a) => a.functionid === fn.id);

                const signature = {
                    label: `${fn.name}(${fnArgs.map((a) => a.name).join("; ")})`,
                    documentation: fn.description,
                    parameters: fnArgs.map((arg) => ({
                        label: arg.name,
                        documentation: arg.description ?? "",
                    })),
                };

                // rough estimation of current arg index based on ; count
                const argText = textUntilNow.split(`${fnName}(`)[1] || "";
                const activeParameter = argText.split(";").length - 1;

                return {
                    value: {
                        signatures: [signature],
                        activeSignature: 0,
                        activeParameter: Math.min(activeParameter, fnArgs.length - 1),
                    },
                    dispose: () => {},
                };
            },
        });
    }, [monaco, functions, args]);

    let docPaneHasBeenForced = false;

    return (
        <div className="h-screen w-full bg-gray-800">
            <Editor
                onMount={(editor, monaco) => {
                    editor.onDidChangeModelContent(() => {
                        editor.trigger("keyboard", "editor.action.triggerSuggest", {});

                        // only force open ONCE for new users
                        if (!docPaneHasBeenForced) {
                            setTimeout(() => {
                                const controller = editor.getContribution("editor.contrib.suggestController") as any;
                                const widget = document.querySelector(".suggest-widget.no-type");
                                const alreadyOpen = widget?.classList.contains("shows-details");

                                if (!alreadyOpen) {
                                    controller?.toggleSuggestionDetails?.();
                                }

                                docPaneHasBeenForced = true;
                            }, 10);
                        }
                    });

                    const forceDocPane = () => {
                        const details = document.querySelector(".suggest-details.no-type") as HTMLElement | null;
                        if (details) {
                            details.style.width = "auto";
                            details.style.maxWidth = "600px";
                            details.style.height = "auto";
                            details.style.maxHeight = "none";
                            details.style.fontSize = "14px";
                            details.style.padding = "4px";
                            details.style.overflow = "visible";
                            details.style.boxSizing = "border-box";
                            details.style.margin = "0";
                        }

                        const container = document.querySelector(".suggest-details-container") as HTMLElement | null;
                        if (container) {
                            container.style.display = "block";
                            container.style.width = "600px";
                            container.style.padding = "1px";
                            container.style.overflow = "visible";
                            container.style.alignItems = "flex-start";
                        }

                        const scrollable = details?.querySelector(".monaco-scrollable-element") as HTMLElement | null;
                        if (scrollable) {
                            scrollable.style.overflow = "visible";
                            scrollable.style.maxHeight = "none";
                            scrollable.style.boxShadow = "none";
                        }

                        const shadow = details?.querySelector(".scrollbar-shadow-top") as HTMLElement | null;
                        if (shadow) {
                            shadow.style.display = "none";
                        }

                        const widget = document.querySelector(".suggest-widget") as HTMLElement | null;
                        if (widget && !widget.classList.contains("shows-details")) {
                            widget.classList.add("shows-details");
                        }
                    };

                    const observer = new MutationObserver(forceDocPane);
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                    });

                    editor.onDidChangeModelContent(() => {
                        editor.trigger("keyboard", "editor.action.triggerSuggest", {});
                    });

                    return () => observer.disconnect();
                }}
                height="100%"
                defaultLanguage="wynntils"
                defaultValue=""
                theme="vs-dark"
                options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    suggest: {
                        showInlineDetails: true,
                        showIcons: true,
                    },
                }}
            />
        </div>
    );
}
