import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { functionsCatalog, FunctionArgumentMetadata } from "../metadata/functionsCatalog";
import { parse, FunctionCall, ParsedArgument } from "../parsing/parser";
import { inferArgumentType, isTypeCompatible } from "../analysis/typeSystem";

const VARIABLE_DECLARATION_PATTERN = /^\s*let\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^;]*);/gm;
const PLACEHOLDER_PATTERN = /[@$]\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

interface VariableDeclaration {
  offset: number;
  length: number;
}

export function buildDiagnostics(document: TextDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const documentText = document.getText();

  const declaredVariables = collectVariableDeclarations(documentText, document, diagnostics);
  reportUndefinedPlaceholders(documentText, document, diagnostics, declaredVariables);
  reportFunctionIssues(documentText, document, diagnostics);

  return diagnostics;
}

function collectVariableDeclarations(
  documentText: string,
  document: TextDocument,
  diagnostics: Diagnostic[]
): Map<string, VariableDeclaration> {
  const declarations = new Map<string, VariableDeclaration>();
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_DECLARATION_PATTERN.exec(documentText)) !== null) {
    const variableName = match[1];
    const declarationOffset = match.index;
    const declarationLength = match[0].length;

    if (declarations.has(variableName)) {
      diagnostics.push(
        createDiagnostic(document, documentText, declarationOffset, declarationLength, DiagnosticSeverity.Warning, `Duplicate variable '${variableName}'`)
      );
      continue;
    }

    declarations.set(variableName, { offset: declarationOffset, length: declarationLength });
  }

  return declarations;
}

function reportUndefinedPlaceholders(
  documentText: string,
  document: TextDocument,
  diagnostics: Diagnostic[],
  declaredVariables: Map<string, VariableDeclaration>
): void {
  let match: RegExpExecArray | null;

  while ((match = PLACEHOLDER_PATTERN.exec(documentText)) !== null) {
    const variableName = match[1];
    const placeholderOffset = match.index;
    const placeholderLength = match[0].length;

    if (!declaredVariables.has(variableName)) {
      diagnostics.push(
        createDiagnostic(document, documentText, placeholderOffset, placeholderLength, DiagnosticSeverity.Error, `Undefined variable '${variableName}'`)
      );
    }
  }
}

function reportFunctionIssues(documentText: string, document: TextDocument, diagnostics: Diagnostic[]): void {
  const parseResult = parse(documentText);
  const callLookup = new Map<number, FunctionCall>();

  for (const functionCall of parseResult.calls) {
    callLookup.set(functionCall.startOffset, functionCall);
  }

  for (const parseError of parseResult.errors) {
    diagnostics.push(createDiagnostic(document, documentText, parseError.offset, parseError.length, DiagnosticSeverity.Error, parseError.message));
  }

  for (const functionCall of parseResult.calls) {
    const metadata = functionsCatalog.findByName(functionCall.name);

    if (!metadata) {
      diagnostics.push(
        createDiagnostic(
          document,
          documentText,
          functionCall.startOffset,
          functionCall.name.length,
          DiagnosticSeverity.Warning,
          `Unknown function '${functionCall.name}'`
        )
      );
      continue;
    }

    validateArguments(functionCall, metadata.arguments, document, documentText, diagnostics, callLookup);
  }
}

function validateArguments(
  functionCall: FunctionCall,
  expectedArguments: FunctionArgumentMetadata[],
  document: TextDocument,
  documentText: string,
  diagnostics: Diagnostic[],
  callLookup: Map<number, FunctionCall>
): void {
  const providedArguments = functionCall.arguments;
  const expectedCount = expectedArguments.length;

  for (let index = 0; index < expectedCount; index++) {
    const expectedArgument = expectedArguments[index];
    const providedArgument = providedArguments[index];

    if (!hasValue(providedArgument)) {
      if (expectedArgument.required) {
        diagnostics.push(
          createDiagnostic(
            document,
            documentText,
            functionCall.startOffset,
            functionCall.endOffset - functionCall.startOffset,
            DiagnosticSeverity.Error,
            `'${functionCall.name}' is missing required argument '${expectedArgument.name}'`
          )
        );
      }
      continue;
    }

    const inferredType = inferArgumentType(providedArgument, callLookup);

    if (!inferredType) {
      continue;
    }

    if (!isTypeCompatible(expectedArgument.type, inferredType)) {
      const startOffset = providedArgument.startOffset >= 0 ? providedArgument.startOffset : functionCall.startOffset;
      const endOffset =
        providedArgument.endOffset >= 0 ? providedArgument.endOffset : functionCall.startOffset + functionCall.name.length;

      diagnostics.push(
        createDiagnostic(
          document,
          documentText,
          startOffset,
          endOffset - startOffset,
          DiagnosticSeverity.Error,
          `'${functionCall.name}' argument '${expectedArgument.name}' expects ${expectedArgument.type}; received ${inferredType}`
        )
      );
    }
  }

  for (let index = expectedCount; index < providedArguments.length; index++) {
    const extraArgument = providedArguments[index];
    if (!hasValue(extraArgument)) {
      continue;
    }

    const startOffset = extraArgument.startOffset >= 0 ? extraArgument.startOffset : functionCall.startOffset;
    const endOffset = extraArgument.endOffset >= 0 ? extraArgument.endOffset : functionCall.endOffset;

    diagnostics.push(
      createDiagnostic(
        document,
        documentText,
        startOffset,
        endOffset - startOffset,
        DiagnosticSeverity.Warning,
        `'${functionCall.name}' does not accept argument ${index + 1}`
      )
    );
  }
}

function hasValue(argument: ParsedArgument | undefined): argument is ParsedArgument {
  if (!argument) {
    return false;
  }

  if (argument.tokens.length === 0) {
    return false;
  }

  if (argument.text.trim().length === 0) {
    return false;
  }

  return true;
}

function createDiagnostic(
  document: TextDocument,
  documentText: string,
  offset: number,
  length: number,
  severity: DiagnosticSeverity,
  message: string
): Diagnostic {
  const start = document.positionAt(offset);
  const safeLength = Math.max(length, 1);
  const end = document.positionAt(Math.min(offset + safeLength, documentText.length));

  return {
    range: { start, end },
    message,
    severity,
    source: "wynntils"
  };
}
