import Editor, { Monaco, useMonaco } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type { editor as MonacoEditorTypes } from "monaco-editor";

function ensureWynntilsLanguageRegistered(monacoInstance: Monaco | null) {
    if (!monacoInstance) {
        console.warn("IDE: Monaco instance not available for language registration.");
        return;
    }
    try {
        const languages = monacoInstance.languages.getLanguages();
        if (!languages.find((lang) => lang.id === "wynntils")) {
            monacoInstance.languages.register({ id: "wynntils" });
            console.log("IDE: Registered 'wynntils' language with Monaco.");
        }
    } catch (e) {
        console.error("IDE: Error during ensureWynntilsLanguageRegistered:", e);
    }
}

export default function FunctionIDE() {
    const monaco = useMonaco();
    const docPaneHasBeenForcedRef = useRef(false);
    const [clientServicesReady, setClientServicesReady] = useState(false);
    const [initializationError, setInitializationError] = useState<Error | null>(null);
    const lspDisposerRef = useRef<{ dispose: () => void } | null>(null);

    useEffect(() => {
        // Configure Monaco's loader to know where to get worker files from if not already handled
        // This is more about Monaco Editor's own workers (like editor.worker.js), not your LSP worker.
        // Often, @monaco-editor/react handles this, but explicit configuration can be safer.
        // loader.config({ paths: { vs: '/monaco-editor/min/vs' } }); // Example if serving from public
        // Or if using a CDN:
        // loader.config({ 'vs/nls': { availableLanguages: {'*': 'de'} }, paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs' } });

        let isMounted = true;

        if (monaco && typeof window !== "undefined") {
            // Ensure monaco is loaded and we are on client
            if (lspDisposerRef.current) {
                // Prevent re-initialization
                console.log("IDE: LSP setup already initiated or completed.");
                return;
            }
            console.log("IDE: Monaco available. Attempting to initialize services and start LSP.");
        }

        return () => {
            isMounted = false;
            if (lspDisposerRef.current) {
                console.log("IDE: useEffect cleanup - Disposing LSP Client and services.");
                lspDisposerRef.current.dispose();
                lspDisposerRef.current = null; // Clear the ref
            }
        };
    }, [monaco]); // Dependency array includes monaco

    const handleEditorMount = (
        editorInstance: MonacoEditorTypes.IStandaloneCodeEditor, // Use correct type
        monacoInstance: Monaco,
    ) => {
        console.log("IDE: Editor onMount triggered.");
        try {
            // It's good to ensure language is registered here too
            ensureWynntilsLanguageRegistered(monacoInstance);

            editorInstance.onDidChangeModelContent(() => {
                try {
                    if (!docPaneHasBeenForcedRef.current) {
                        setTimeout(() => {
                            const controller = editorInstance.getContribution(
                                "editor.contrib.suggestController",
                            ) as any;
                            const widget = document.querySelector(".suggest-widget"); // More generic
                            const alreadyOpen = widget?.classList.contains("shows-details");

                            if (
                                controller &&
                                typeof controller.toggleSuggestionDetails === "function" &&
                                !alreadyOpen
                            ) {
                                controller.toggleSuggestionDetails();
                            } else if (widget && !alreadyOpen) {
                                widget.classList.add("shows-details");
                            }
                            docPaneHasBeenForcedRef.current = true;
                        }, 50);
                    }
                    editorInstance.trigger("keyboard", "editor.action.triggerSuggest", {});
                } catch (e) {
                    console.error("IDE: Error in onDidChangeModelContent (docPane/triggerSuggest):", e);
                }
            });

            editorInstance.onKeyDown((e) => {
                // Use correct type
                try {
                    const triggerKeys = ["(", ";", "Tab"];
                    if (triggerKeys.includes(e.browserEvent.key)) {
                        setTimeout(() => {
                            // Delay for char to appear
                            editorInstance.trigger("keyboard", "editor.action.triggerParameterHints", {});
                        }, 10);
                    }
                } catch (e) {
                    console.error("IDE: Error in onKeyDown (triggerParameterHints):", e);
                }
            });

            // Your forceDocPane logic and MutationObserver
            // Keep this code if you still need it, but be aware of its fragility.
            // const forceDocPane = () => { ... };
            // const observer = new MutationObserver(forceDocPane);
            // observer.observe(document.body, { childList: true, subtree: true });
            // return () => observer.disconnect(); // Make sure to return this if observer is used
        } catch (e) {
            console.error("IDE: CRITICAL ERROR in editor onMount:", e);
        }
    };

    if (initializationError) {
        return (
            <div style={{ color: "red", padding: "20px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                <h2>Error Initializing IDE Services:</h2>
                <p>{initializationError.message}</p>
                <p>Stack: {initializationError.stack}</p>
            </div>
        );
    }

    if (!clientServicesReady) {
        return <p style={{ padding: "20px" }}>Initializing Language Services...</p>;
    }

    return (
        <div className="h-screen w-full bg-gray-800">
            <Editor
                onMount={handleEditorMount}
                height="100%"
                defaultLanguage="wynntils"
                defaultValue="// Wynntils IDE - Ready\n"
                theme="vs-dark"
                options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    suggest: {
                        showInlineDetails: true,
                        showIcons: true,
                    },
                    parameterHints: { enabled: true }, // Ensure parameter hints are on
                    quickSuggestions: { other: true, comments: true, strings: true },
                }}
            />
        </div>
    );
}
