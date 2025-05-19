// https://github.com/microsoft/monaco-editor/blob/main/samples/browser-esm-vite-react/src/userWorker.ts
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import EditorServiceWorker from "monaco-editor/esm/vs/editor/edcore.main?worker";

self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
        switch (label) {
            case "json":
                return new JsonWorker();
            case "css":
                return new CssWorker();
            case "html":
                return new HtmlWorker();
            case "typescript":
            case "javascript":
                return new TsWorker();
            case "editorWorkerService":
                return new EditorServiceWorker();
            default:
                return new EditorWorker();
        }
    }
};

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
