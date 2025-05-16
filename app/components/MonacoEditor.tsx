import { useRef } from "react";
import * as monaco from "monaco-editor";
import { ConsoleLogger } from "monaco-languageclient/tools";
import { LogLevel } from "@codingame/monaco-vscode-api";
import { initServices } from "monaco-languageclient/vscode/services";
import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";
import { LanguageClientWrapper } from "monaco-editor-wrapper";
import type { LanguageClientConfig } from "monaco-editor-wrapper";

const MonacoEditor = async () => {
    const containerRef = useRef<HTMLDivElement>(null);

    const logger = new ConsoleLogger(LogLevel.Debug);
    await initServices(
        {
            serviceOverrides: {
                // none
            },
            userConfiguration: {
                json: JSON.stringify({
                    "editor.experimental.asyncTokenization": true
                })
            }
        },
        {
            logger
        }
    );

    monaco.languages.register({
        id: "wynntils"
    });

    configureDefaultWorkerFactory(logger);

    if (!containerRef.current) return <p>containerRef.current is null</p>;
    monaco.editor.create(containerRef.current, {
        value: "Wynntils scripting goes here",
        language: "wynntils",
        theme: "vs-dark",
        automaticLayout: true,
        wordBasedSuggestions: "off"
    });

    const languageClientConfig: LanguageClientConfig = {
        clientOptions: {
            documentSelector: ["wynntils"]
        },
        connection: {
            options: {
                $type: "WebSocketUrl",
                url: "ws://localhost:30000/sampleServer"
            }
        }
    };

    const languageClientWrapper = new LanguageClientWrapper({
        languageClientConfig,
        logger
    });

    await languageClientWrapper.start();

    return <div ref={containerRef} className="h-screen w-full" />;
};

export default MonacoEditor;
