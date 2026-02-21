import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeResult
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createFunctionCompletionItems } from "./features/completions";
import { buildDiagnostics } from "./features/diagnostics";
import { createHoverForPosition } from "./features/hover";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
const completionItems = createFunctionCompletionItems();

connection.onInitialize((/* params */): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ["{", "(", ";"] },
    hoverProvider: true
  }
}));

documents.onDidOpen(event => validateDocument(event.document));
documents.onDidChangeContent(event => validateDocument(event.document));

connection.onCompletion(params => {
  const document = documents.get(params.textDocument.uri);

  if (
    document &&
    params.context?.triggerCharacter === ";" &&
    isVariableDeclarationLine(document, params.position.line)
  ) {
    return [];
  }

  return completionItems;
});

connection.onHover(params => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  return createHoverForPosition(document, params.position);
});

function validateDocument(document: TextDocument): void {
  const diagnostics = buildDiagnostics(document);
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

function isVariableDeclarationLine(document: TextDocument, lineNumber: number): boolean {
  const documentText = document.getText();
  const lineStartOffset = document.offsetAt({ line: lineNumber, character: 0 });
  const lineEndOffset =
    lineNumber + 1 < document.lineCount ? document.offsetAt({ line: lineNumber + 1, character: 0 }) : documentText.length;
  const lineText = documentText.slice(lineStartOffset, lineEndOffset);

  return /^\s*let\s+/.test(lineText);
}

documents.listen(connection);
connection.listen();
