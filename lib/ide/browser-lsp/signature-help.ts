import { formatSignature, FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { findActiveCallContext } from "@/lib/ide/browser-lsp/call-context";
import { formatArgumentLabel, resolveArgumentSlot } from "@/lib/ide/browser-lsp/function-arguments";
import { BrowserTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { LspPosition, LspSignatureHelp } from "@/lib/ide/types";

export function createSignatureHelp(
    document: BrowserTextDocument,
    position: LspPosition,
    catalog: FunctionsCatalog,
): LspSignatureHelp | null {
    const context = findActiveCallContext(document, position);

    if (!context) {
        return null;
    }

    const metadata = catalog.findByName(context.functionName);

    if (!metadata) {
        return null;
    }

    const parameterCount = metadata.arguments.length;
    const activeArgumentSlot = resolveArgumentSlot(metadata.arguments, context.activeParameter);

    return {
        signatures: [createSignatureInformation(metadata)],
        activeSignature: 0,
        activeParameter: activeArgumentSlot?.index ?? Math.min(context.activeParameter, Math.max(parameterCount - 1, 0)),
    };
}

function createSignatureInformation(metadata: FunctionMetadata) {
    const signature = formatSignature(metadata, true, true);
    const description = metadata.description ? `\n\n${metadata.description}` : "";

    return {
        label: `${metadata.canonicalName}${signature} -> ${metadata.returnType}`,
        documentation: {
            kind: "markdown" as const,
            value: description.trim(),
        },
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
