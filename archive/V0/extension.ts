import * as vscode from 'vscode';
import { PandocEditor } from './editor/PandocEditor';
import { PandocHandler } from './services/PandocHandler';
import { Logger } from './utils/logger';

export { PandocEditor };

export async function activate(context: vscode.ExtensionContext) {
  console.log("Pandoc WYSIWYG extension is now active");

  // Initialize PandocHandler
  try {
    const logger = Logger.getInstance();
    const pandocHandler = PandocHandler.getInstance(logger);
    await pandocHandler.initialize();
    console.log("PandocHandler initialized successfully");
  } catch (error) {
    console.error("Failed to initialize PandocHandler:", error);
    vscode.window.showErrorMessage(
      `Failed to initialize Pandoc integration: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Register our custom editor provider
  const provider = new PandocEditor(context);
  const providerRegistration = vscode.window.registerCustomEditorProvider(
    "pandoc-wysiwyg.editor",
    provider,
    {
      webviewOptions: { 
        retainContextWhenHidden: true,
        enableFindWidget: true
      },
      supportsMultipleEditorsPerDocument: false
    }
  );

  context.subscriptions.push(providerRegistration);

  // Register the command to open a document in the Pandoc editor
  const openCommand = vscode.commands.registerCommand("pandoc-wysiwyg.openAsPandoc", () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      vscode.commands.executeCommand(
        "vscode.openWith",
        activeEditor.document.uri,
        "pandoc-wysiwyg.editor",
        vscode.ViewColumn.Beside
      );
    } else {
      vscode.window.showInformationMessage("No active editor");
    }
  });

  context.subscriptions.push(openCommand);
}

export function deactivate() {
  console.log("Pandoc WYSIWYG extension is now deactivated");
}
