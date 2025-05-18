import { configureDefaultWorkerFactory } from "monaco-editor-wrapper/workers/workerLoaders";
import { initServices } from "monaco-languageclient/vscode/services";
import { ConsoleLogger } from "monaco-languageclient/tools";
import {
    LanguageClientWrapper,
    MonacoEditorLanguageClientWrapper
} from "monaco-editor-wrapper";
import {
    BrowserMessageReader,
    BrowserMessageWriter
} from "vscode-languageserver/browser";

import type {
    LanguageClientConfig,
    WrapperConfig
} from "monaco-editor-wrapper";

const wrapper = new MonacoEditorLanguageClientWrapper();

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

    // // register the JSON language with Monaco
    // monaco.languages.register({
    //     id: "wynntils"
    // });
    // monaco.languages.setMonarchTokensProvider("wynntils", {
    //     tokenizer: {
    //         root: [
    //             [/\d+/, "number"],
    //             [/;/, "delimiter"],
    //             [/"[^"]*"/, "string"]
    //         ]
    //     }
    // });
    //
    // // create monaco editor
    // monaco.editor.create(document.getElementById("monaco-editor-root")!, {
    //     value: "wynntils scripting goes here",
    //     language: "wynntils",
    //     automaticLayout: true,
    //     wordBasedSuggestions: "off",
    //     theme: "vs-dark"
    // });

    const languageClientConfig: LanguageClientConfig = {
        clientOptions: {
            documentSelector: ["wynntils"]
        },
        connection: {
            options: { $type: "WorkerDirect", worker: worker },
            messageTransports: { reader, writer }
        }
    };
    const wrapperConfig: WrapperConfig = {
        $type: "extended",
        htmlContainer: document.getElementById("monaco-editor-root")!,
        logLevel: 2,
        vscodeApiConfig: {
            serviceOverrides: {},
            userConfiguration: {
                json: JSON.stringify({
                    "workbench.colorTheme": "Default Dark Modern",
                    "editor.guides.bracketPairsHorizontal": "active",
                    "editor.wordBasedSuggestions": "off",
                    "editor.experimental.asyncTokenization": true
                })
            }
        },
        editorAppConfig: {
            codeResources: {
                modified: {
                    text: "test",
                    uri: "/workspace/test"
                }
            },
            monacoWorkerFactory: configureDefaultWorkerFactory,
            editorOptions: {
                language: "wynntils",
                theme: "vs-dark"
            }
        },
        languageClientConfigs: {
            configs: {
                wynntils: languageClientConfig
            }
        }
    };

    await wrapper.initAndStart(wrapperConfig);

    const languageClientWrapper = new LanguageClientWrapper({
        languageClientConfig,
        logger
    });

    await languageClientWrapper.start();
};
