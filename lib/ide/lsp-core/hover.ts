// Adapted from DevChromium/wynntils-functions-tools (MIT License).

import { formatSignature, FunctionsCatalog } from "@/lib/ide/lsp-core/catalog";
import { LspHover } from "@/lib/ide/types";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_HOVER = true;

function isIdentifierCharacter(character: string) {
    return /[A-Za-z0-9_]/.test(character);
}

function extractIdentifierAtOffset(text: string, offset: number): string | null {
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

function formatArgumentsSection(catalogName: string, catalog: FunctionsCatalog) {
    const metadata = catalog.findByName(catalogName);

    if (!metadata || metadata.arguments.length === 0) {
        return "\n\n**Arguments:** (none)";
    }

    const lines = metadata.arguments.map((argument) => {
        const requirement = argument.required ? "required" : "optional";
        const hasDefault = argument.defaultValue !== undefined && argument.defaultValue !== null;
        const defaultValue = hasDefault ? ` = ${argument.defaultValue}` : "";

        return `- \`${argument.name}\` (${argument.type}, ${requirement})${defaultValue}`;
    });

    return `\n\n**Arguments:**\n${lines.join("\n")}`;
}

export function createHoverForOffset(documentText: string, offset: number, catalog: FunctionsCatalog): LspHover | null {
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
    const argumentsSection = formatArgumentsSection(metadata.canonicalName, catalog);
    const aliasSection =
        metadata.aliases.length > 0 ? `\n\n**Aliases:** ${metadata.aliases.join(", ")}` : "\n\n**Aliases:** none";

    return {
        markdown: `**${metadata.canonicalName}**${signature} -> \`${metadata.returnType}\`${descriptionSection}${argumentsSection}${aliasSection}`,
    };
}
