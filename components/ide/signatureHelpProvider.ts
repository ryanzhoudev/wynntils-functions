import { wynntilsargument, wynntilsfunction } from "@prisma/client";
import { languages } from "monaco-editor";
import SignatureHelpProvider = languages.SignatureHelpProvider;

export default function signatureHelpProvider(
    functions: wynntilsfunction[],
    args: wynntilsargument[],
): SignatureHelpProvider {
    return {
        signatureHelpTriggerCharacters: ["(", ";", " "],
        signatureHelpRetriggerCharacters: ["(", ";", " "],
        provideSignatureHelp: (model, position) => {
            const textUntilNow = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            const match = /([a-zA-Z_]\w*)\s*\([^()]*/.exec(textUntilNow);
            const fnName = match?.[1];
            const fn = functions.find((f) => f.name === fnName);
            if (!fn) return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose: () => {} };

            const fnArgs = args.filter((a) => a.functionid === fn.id);

            const signature = {
                label: `${fn.name}(${fnArgs.map((a) => a.name).join("; ")})`,
                documentation: fn.description,
                parameters: fnArgs.map((arg) => ({
                    label: arg.name,
                    documentation: arg.description ?? "",
                })),
            };

            const argText = textUntilNow.split(`${fnName}(`)[1] || "";
            const activeParameter = argText.split(";").length - 1;

            return {
                value: {
                    signatures: [signature],
                    activeSignature: 0,
                    activeParameter: Math.min(activeParameter, fnArgs.length - 1),
                },
                dispose: () => {},
            };
        },
    };
}
