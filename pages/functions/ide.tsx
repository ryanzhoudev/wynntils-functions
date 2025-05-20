"use client";

import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { wynntilsfunction, wynntilsargument } from "@prisma/client";
import completionItemProvider from "@/components/ide/completionItemProvider.ts";
import signatureHelpProvider from "@/components/ide/signatureHelpProvider.ts";
import tokensProvider from "@/components/ide/tokensProvider.ts";
import getThemeDefinition from "@/components/ide/themeDefinition.ts";
import { restyleSuggestPanes } from "@/components/ide/styleHelpers.ts";

const wynntils = "wynntils";
const wynntilsTheme = "wynntilsTheme";

export default function FunctionIDE() {
    const monaco = useMonaco();
    const [functions, setFunctions] = useState<wynntilsfunction[]>([]);
    const [args, setArgs] = useState<wynntilsargument[]>([]);

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
                        editor.trigger("keyboard", "editor.action.triggerSuggest", {});
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
