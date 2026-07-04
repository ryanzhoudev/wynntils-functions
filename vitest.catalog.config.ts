import { defineConfig } from "vitest/config";
import { vitestResolve } from "./vitest.shared";

export default defineConfig({
    resolve: vitestResolve,
    test: {
        environment: "node",
        include: ["tests/catalog/**/*.test.ts"],
        coverage: { enabled: false },
    },
});
