//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

export default [
    ...tanstackConfig,
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "@typescript-eslint/array-type": [
                "off",
                {
                    default: "generic",
                    readonly: "generic"
                }
            ]
        }
    }
];
