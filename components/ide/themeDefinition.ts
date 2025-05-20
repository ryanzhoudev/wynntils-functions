import { editor } from "monaco-editor";
import IStandaloneThemeData = editor.IStandaloneThemeData;
import WynntilsLexer from "@/lib/antlr/WynntilsLexer.ts";

export default function getThemeDefinition(): IStandaloneThemeData {
    return {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "UNKNOWN", foreground: colors.normalText },
            { token: "RCURLY", foreground: colors.delimiter },
            { token: "LCURLY", foreground: colors.delimiter },
            { token: "RPAREN", foreground: colors.delimiter },
            { token: "LPAREN", foreground: colors.delimiter },
            { token: "SEMI", foreground: colors.delimiter },
            { token: "STRING", foreground: colors.string },
            { token: "NUMBER", foreground: colors.number },
            { token: "BOOLEAN", foreground: colors.keyword },
            { token: "IDENTIFIER", foreground: colors.function },
            { token: "COLOR_CODE", foreground: colors.colorcode },
        ],

        colors: {},
    };
}

// trying to match darcula colors
// https://github.com/doums/darcula/blob/master/colors/darcula.vim
const colors = {
    normalText: "#A9B7C6",
    delimiter: "#A9B7C6",
    string: "#6A8759",
    number: "#6897BB",
    keyword: "#CC7832",
    function: "#FFC66D",
    // colorcode, lighter green than string
    colorcode: "#A5C261",
};
