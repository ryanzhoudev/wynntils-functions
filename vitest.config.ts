import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.{ts,tsx}"],
        exclude: ["tests/e2e/**", "tests/catalog/**"],
        setupFiles: ["tests/setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov", "json"],
            reportsDirectory: "coverage",
            include: ["lib/**/*.ts"],
            exclude: ["lib/prisma.ts", "lib/ide/browser-lsp/worker.ts"],
        },
    },
});
