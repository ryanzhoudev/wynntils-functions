import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";
import { config } from "vinxi/plugins/config";

export default defineConfig({
    vite: {
        plugins: [
            tsConfigPaths({
                projects: ["./tsconfig.json"]
            }),
            config("custom", {
                optimizeDeps: {
                    exclude: [""]
                },
                build: {
                    sourcemap: false
                }
            })
        ]
    }
});
