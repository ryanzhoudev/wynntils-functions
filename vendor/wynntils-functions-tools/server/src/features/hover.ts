import { Hover, MarkupKind, Position } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { formatSignature, functionsCatalog, FunctionMetadata } from "../metadata/functionsCatalog";

const INCLUDE_OPTIONAL_ARGUMENTS_IN_HOVER = true;

export function createHoverForPosition(document: TextDocument, position: Position): Hover | null {
  const documentText = document.getText();
  const offset = document.offsetAt(position);
  const identifier = extractIdentifierAtOffset(documentText, offset);

  if (!identifier) {
    return null;
  }

  const metadata = functionsCatalog.findByName(identifier);
  if (!metadata) {
    return null;
  }

  const signature = formatSignature(metadata, INCLUDE_OPTIONAL_ARGUMENTS_IN_HOVER, true);
  const descriptionSection = metadata.description ? `\n\n${metadata.description}` : "";
  const argumentsSection = formatArgumentsSection(metadata);
  const aliasSection =
    metadata.aliases.length > 0 ? `\n\n**Aliases:** ${metadata.aliases.join(", ")}` : "\n\n**Aliases:** none";

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**${metadata.canonicalName}**${signature} -> \`${metadata.returnType}\`${descriptionSection}${argumentsSection}${aliasSection}`
    }
  };
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

function isIdentifierCharacter(character: string): boolean {
  return /[A-Za-z0-9_]/.test(character);
}

function formatArgumentsSection(metadata: FunctionMetadata): string {
  if (!metadata || metadata.arguments.length === 0) {
    return "\n\n**Arguments:** (none)";
  }

  const lines = metadata.arguments.map(argument => {
    const requirement = argument.required ? "required" : "optional";
    const hasDefault =
      argument.defaultValue !== undefined && argument.defaultValue !== null && String(argument.defaultValue).length > 0;
    const defaultValue = hasDefault ? ` = ${argument.defaultValue}` : "";
    return `- \`${argument.name}\` (${argument.type}, ${requirement})${defaultValue}`;
  });

  return `\n\n**Arguments:**\n${lines.join("\n")}`;
}
