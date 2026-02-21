import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
    ...nextVitals,
    ...nextTypescript,
    globalIgnores([
        ".next/**",
        "out/**",
        "build/**",
        ".generated/**",
        "vendor/wynntils-functions-tools/**",
        "next-env.d.ts",
    ]),
]);
