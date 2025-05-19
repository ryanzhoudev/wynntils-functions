import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";
import { initServices } from "monaco-languageclient/vscode/services";
import { ConsoleLogger } from "monaco-languageclient/tools";
import { LanguageClientWrapper } from "monaco-editor-wrapper";
import {
    BrowserMessageReader,
    BrowserMessageWriter
} from "vscode-languageserver/browser";
import * as monaco from "monaco-editor";

import type { LanguageClientConfig } from "monaco-editor-wrapper";

export const runClient = async () => {
    // import { LogLevel } from "@codingame/monaco-vscode-api";
    const logger = new ConsoleLogger(2);
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
    configureDefaultWorkerFactory(logger);

    const worker = new Worker(
        new URL("../workers/lsp.worker.ts?worker", import.meta.url),
        {
            type: "module"
        }
    );
    const reader = new BrowserMessageReader(worker);
    const writer = new BrowserMessageWriter(worker);

    monaco.languages.register({
        id: "wynntils"
    });
    monaco.languages.setMonarchTokensProvider("wynntils", {
        tokenizer: {
            root: [
                [/\d+/, "number"],
                [/;/, "delimiter"],
                [/"[^"]*"/, "string"]
            ]
        }
    });

    // create monaco editor
    monaco.editor.create(document.getElementById("monaco-editor-root")!, {
        value: "wynntils scripting goes here",
        language: "wynntils",
        automaticLayout: true,
        wordBasedSuggestions: "off",
        theme: "vs-dark"
    });

    const languageClientConfig: LanguageClientConfig = {
        clientOptions: {
            documentSelector: ["wynntils"]
        },
        connection: {
            options: { $type: "WorkerDirect", worker: worker },
            messageTransports: { reader, writer }
        }
    };

    const languageClientWrapper = new LanguageClientWrapper({
        languageClientConfig,
        logger
    });

    await languageClientWrapper.start();
};
