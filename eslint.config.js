//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

export default [
  ...tanstackConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/array-type": [
        "none",
        {
          default: "generic",
          readonly: "generic",
        },
      ],
    },
  },
];
