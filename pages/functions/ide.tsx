"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { wynntilsargument, wynntilsfunction } from "@prisma/client";
import completionItemProvider from "@/components/ide/completionItemProvider.ts";
import signatureHelpProvider from "@/components/ide/signatureHelpProvider.ts";
import tokensProvider from "@/components/ide/tokensProvider.ts";
import getThemeDefinition from "@/components/ide/themeDefinition.ts";
import { restyleSuggestPanes } from "@/components/ide/styleHelpers.ts";
import { CharStreams, CommonTokenStream } from "antlr4";
import WynntilsLexer from "@/lib/antlr/WynntilsLexer.ts";
import WynntilsParser from "@/lib/antlr/WynntilsParser.ts";
import { FunctionValidatorVisitor, getInvalidFunctions } from "@/components/ide/FunctionValidatorVisitor.ts";
import { editor } from "monaco-editor";
import IMarkerData = editor.IMarkerData;

const wynntils = "wynntils";
const wynntilsTheme = "wynntilsTheme";

export default function FunctionIDE() {
    const monaco = useMonaco();
    const [functions, setFunctions] = useState<wynntilsfunction[]>([]);
    const [args, setArgs] = useState<wynntilsargument[]>([]);
    const validatorRef = useRef<FunctionValidatorVisitor | null>(null);

    monaco?.editor.defineTheme(wynntilsTheme, getThemeDefinition());

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

        monaco.languages.register({ id: wynntils });

        monaco.languages.setTokensProvider(wynntils, tokensProvider());

        monaco.languages.registerCompletionItemProvider(wynntils, completionItemProvider(monaco, functions, args));

        monaco.languages.registerSignatureHelpProvider(wynntils, signatureHelpProvider(functions, args));

        validatorRef.current = new FunctionValidatorVisitor(functions);
    }, [monaco, functions, args]);

    let docPaneHasBeenForced = false;

    return (
        <div className="h-screen w-full bg-gray-800">
            <Editor
                onMount={(editor, monaco) => {
                    editor.onDidChangeModelContent(() => {
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

                    editor.onDidChangeModelContent(() => {
                        // editor.trigger("keyboard", "editor.action.triggerSuggest", {});
                        // editor.trigger("keyboard", "editor.action.triggerParameterHints", {});
                        const suggestCtrl = editor.getContribution("editor.contrib.suggestController") as any;
                        suggestCtrl.triggerSuggest();
                    });

                    editor.onDidChangeModelContent(() => {
                        const code = editor.getValue();
                        const inputStream = CharStreams.fromString(code);
                        const lexer = new WynntilsLexer(inputStream);
                        const tokenStream = new CommonTokenStream(lexer);
                        const parser = new WynntilsParser(tokenStream);

                        const tree = parser.script();

                        console.log("Parsing tree:");
                        validatorRef.current?.visit(tree);

                        const model = editor.getModel();
                        if (!model) return;

                        const diagnostics: IMarkerData[] = getInvalidFunctions().map(({ start, stop }) => {
                            const startPos = model.getPositionAt(start);
                            const endPos = model.getPositionAt(stop + 1);

                            return {
                                severity: monaco.MarkerSeverity.Error,
                                message: "Unknown function",
                                startLineNumber: startPos.lineNumber,
                                startColumn: startPos.column,
                                endLineNumber: endPos.lineNumber,
                                endColumn: endPos.column,
                            };
                        });

                        monaco.editor.setModelMarkers(model, "wynntils-validator", diagnostics);
                    });

                    return restyleSuggestPanes();
                }}
                height="100%"
                defaultLanguage={wynntils}
                defaultValue=""
                theme={wynntilsTheme}
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
