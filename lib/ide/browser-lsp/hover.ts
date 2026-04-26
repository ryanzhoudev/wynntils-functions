import { formatSignature, FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import { parse } from "@/lib/ide/browser-lsp/parser";
import { BrowserTextDocument } from "@/lib/ide/browser-lsp/text-document";
import { LspHover, LspPosition } from "@/lib/ide/types";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_HOVER = true;

export function createHoverForPosition(
    document: BrowserTextDocument,
    position: LspPosition,
    catalog: FunctionsCatalog,
): LspHover | null {
    const documentText = document.getText();
    const offset = document.offsetAt(position);
    const identifier = extractIdentifierAtOffset(documentText, offset);

    if (!identifier) {
        return null;
    }

    const metadata = catalog.findByName(identifier);

    if (!metadata) {
        return null;
    }

    const signature = formatSignature(metadata, INCLUDE_OPTIONAL_ARGUMENTS_IN_HOVER, true);
    const descriptionSection = metadata.description ? `\n\n${metadata.description}` : "";
    const argumentsSection = formatArgumentsSection(metadata);
    const aliasSection =
        metadata.aliases.length > 0 ? `\n\n**Aliases:** ${metadata.aliases.join(", ")}` : "\n\n**Aliases:** none";
    const formatSection = formatSuffixSection(documentText, offset);

    return {
        contents: {
            kind: "markdown",
            value: `**${metadata.canonicalName}**${signature} -> \`${metadata.returnType}\`${descriptionSection}${argumentsSection}${aliasSection}${formatSection}`,
        },
    };
}

function extractIdentifierAtOffset(text: string, offset: number) {
    if (offset < 0 || offset > text.length) {
        return null;
    }

    let start = offset;

    while (start > 0 && isIdentifierCharacter(text[start - 1])) {
        start--;
    }

    let end = offset;

    while (end < text.length && isIdentifierCharacter(text[end])) {
        end++;
    }

    if (start === end) {
        return null;
    }

    return text.slice(start, end);
}

function isIdentifierCharacter(character: string) {
    return /[A-Za-z0-9_]/.test(character);
}

function formatArgumentsSection(metadata: FunctionMetadata) {
    if (!metadata || metadata.arguments.length === 0) {
        return "\n\n**Arguments:** (none)";
    }

    const lines = metadata.arguments.map((argument) => {
        const requirement = argument.required ? "required" : "optional";
        const hasDefault =
            argument.defaultValue !== undefined && argument.defaultValue !== null && String(argument.defaultValue).length > 0;
        const defaultValue = hasDefault ? ` = ${argument.defaultValue}` : "";

        return `- \`${argument.name}\` (${argument.type}, ${requirement})${defaultValue}`;
    });

    return `\n\n**Arguments:**\n${lines.join("\n")}`;
}

function formatSuffixSection(documentText: string, offset: number) {
    const functionCall = parse(documentText).calls.find((call) => {
        return call.formatSuffix && offset >= call.formatSuffix.startOffset && offset <= call.formatSuffix.endOffset;
    });

    if (!functionCall?.formatSuffix?.isValid) {
        return "";
    }

    const suffix = functionCall.formatSuffix;
    const formatLabel = suffix.formatted ? "formatted number output" : "plain number output";
    const decimalsLabel = suffix.decimals === undefined ? "default decimals" : `${suffix.decimals} decimal places`;

    return `\n\n**Format suffix:** \`${suffix.text}\` (${formatLabel}, ${decimalsLabel})`;
}
