import { formatSignature, FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { CallContext, findCallContextStack } from "@/lib/ide/browser-lsp/call-context";
import { formatArgumentLabel, resolveArgumentSlot } from "@/lib/ide/browser-lsp/function-arguments";
import { BrowserTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { LspPosition, LspSignatureHelp } from "@/lib/ide/types";

export function createSignatureHelp(
    document: BrowserTextDocument,
    position: LspPosition,
    catalog: FunctionsCatalog,
): LspSignatureHelp | null {
    const contexts = findCallContextStack(document.getText(), document.offsetAt(position));

    if (contexts.length === 0) {
        return null;
    }

    const signatures = contexts
        .map((context) => {
            const metadata = catalog.findByName(context.functionName);

            if (!metadata) {
                return null;
            }

            return createSignatureInformation(metadata, context);
        })
        .filter((signature) => signature !== null);

    if (signatures.length === 0) {
        return null;
    }

    const activeSignature = signatures.length - 1;
    const activeParameter = signatures[activeSignature].activeParameter ?? 0;

    return {
        signatures,
        activeSignature,
        activeParameter,
    };
}

function createSignatureInformation(metadata: FunctionMetadata, context: CallContext) {
    const signature = formatSignature(metadata, true, true);
    const description = metadata.description ? `\n\n${metadata.description}` : "";
    const parameterCount = metadata.arguments.length;
    const activeArgumentSlot = resolveArgumentSlot(metadata.arguments, context.activeParameter);

    return {
        label: `${metadata.canonicalName}${signature} -> ${metadata.returnType}`,
        documentation: {
            kind: "markdown" as const,
            value: description.trim(),
        },
        activeParameter: activeArgumentSlot?.index ?? Math.min(context.activeParameter, Math.max(parameterCount - 1, 0)),
        parameters: metadata.arguments.map((argument) => {
            const requirement = argument.required ? "required" : "optional";
            const defaultValue =
                argument.defaultValue !== undefined &&
                argument.defaultValue !== null &&
                String(argument.defaultValue).length > 0 &&
                String(argument.defaultValue).toLowerCase() !== "null"
                    ? `\n\nDefault: \`${argument.defaultValue}\``
                    : "";
            const description = argument.description ? `\n\n${argument.description}` : "";

            return {
                label: formatArgumentLabel(argument),
                documentation: {
                    kind: "markdown" as const,
                    value: `\`${argument.name}\` (${argument.type}, ${requirement})${description}${defaultValue}`,
                },
            };
        }),
    };
}
