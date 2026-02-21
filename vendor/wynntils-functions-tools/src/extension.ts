import * as path from "path";
import * as vscode from "vscode";
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import { compileSupersetToWynntils } from "./compile";

let client: LanguageClient;

export function activate(ctx: vscode.ExtensionContext) {
  console.log("Wynntils client activate");
  const serverModule = ctx.asAbsolutePath(path.join("out","server","server.js"));

  const serverOptions: ServerOptions = {
    run:   { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ["--inspect=6009"] } }
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: "wynntils", scheme: "file" }]
  };

  client = new LanguageClient("wynntilsLsp","Wynntils LSP",serverOptions,clientOptions);
  client.start();
  ctx.subscriptions.push(client);

  // Command: compile superset -> Wynntils functions
  ctx.subscriptions.push(
    vscode.commands.registerCommand("wynntils.compileToFunctions", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const src = editor.document.getText();
      const res = compileSupersetToWynntils(src);
      const doc = await vscode.workspace.openTextDocument({ language: "wynntils", content: res.code });
      await vscode.window.showTextDocument(doc, { preview: false });
      if (res.errors.length) {
        vscode.window.showWarningMessage(`Compiled with ${res.errors.length} issue(s). Check diagnostics in the source document.`);
      }
    })
  );
}
export function deactivate() { return client?.stop(); }
