// @ts-check

/** @type {import("prettier").Config} */
/** @type {import("@ianvs/prettier-plugin-sort-imports").PrettierConfig} */

module.exports = {
    tabWidth: 4,
    useTabs: false,
    printWidth: 120,
    trailingComma: "all",
    singleQuote: false,
    semi: true,
    importOrder: [
        "^react$",
        "<THIRD_PARTY_MODULES>",
        "",
        "^@src/(.*)$",
        "^@plugins/(.*)$",
        "^@services/(.*)$",
        "^[./]",
    ],
    importOrderBuiltinModulesToTop: true,
    importOrderCaseInsensitive: true,
    importOrderParserPlugins: ["typescript", "decorators-legacy"],
    importOrderMergeDuplicateImports: true,
    importOrderCombineTypeAndValueImports: true,
    importOrderSeparation: false,
    importOrderSortSpecifiers: true,
};
