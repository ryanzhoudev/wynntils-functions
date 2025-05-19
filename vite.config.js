import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

const prefix = `monaco-editor/esm/vs`;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        TanStackRouterVite({ autoCodeSplitting: true }),
        viteReact(),
        tailwindcss()
    ],
    test: {
        globals: true,
        environment: "jsdom"
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src")
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    jsonWorker: [`${prefix}/language/json/json.worker`],
                    cssWorker: [`${prefix}/language/css/css.worker`],
                    htmlWorker: [`${prefix}/language/html/html.worker`],
                    tsWorker: [`${prefix}/language/typescript/ts.worker`],
                    editorServiceWorker: [
                        `${prefix}/editor/edcore.main.worker`
                    ],
                    editorWorker: [`${prefix}/editor/editor.worker`]
                }
            }
        }
    },
    worker: {
        format: "es"
        // plugins: [
        //     monacoEditorPlugin({
        //         publicPath: `monacoeditorwork`,
        //         languageWorkers: ["json", "css", "html", "typescript"]
        //     })
        // ]
    }
});
