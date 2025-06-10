// PandocEditor.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PandocHandler } from '../services/PandocHandler/PandocHandler';
import { Logger } from '../utils/logger';

// Message types for webview communication
interface WebviewMessage {
  type: string;
  content: string;
}

/**
 * Implements a WYSIWYG Markdown editor using Pandoc for conversion
 */
export class PandocEditor implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'pandoc-wysiwyg.editor';
  private isUpdating = false; // Prevents update loops between editor and document
  private documentChangeListener: vscode.Disposable | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Register the editor with VS Code
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      PandocEditor.viewType,
      new PandocEditor(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
          enableFindWidget: true
        },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  /**
   * Called when the editor is opened
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    // Set up message handling from the webview
    this.setupMessageHandlers(webviewPanel, document);

    // Initial render
    await this.updateWebview(document, webviewPanel);

    // Listen for document changes
    this.documentChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString() && !this.isUpdating) {
        this.updateWebview(document, webviewPanel);
      }
    });

    // Clean up on dispose
    webviewPanel.onDidDispose(() => {
      if (this.documentChangeListener) {
        this.documentChangeListener.dispose();
        this.documentChangeListener = null;
      }
    });
  }

  /**
   * Set up message handlers for communication with the webview
   */
  private setupMessageHandlers(
    webviewPanel: vscode.WebviewPanel,
    document: vscode.TextDocument
  ): void {
    webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        try {
          switch (message.type) {
            case 'save':
              try {
                const htmlContent = message.content;

                // 1. Convert HTML from webview to clean Markdown
                const cleanMarkdown = await this.updateDocument(document, htmlContent);

                // 2. Notify webview that save was successful
                webviewPanel.webview.postMessage({
                  type: 'saved',
                  success: true,
                  content: cleanMarkdown // Send back the cleaned markdown for consistency
                });

              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('Error saving document:', error);
                webviewPanel.webview.postMessage({
                  type: 'saved',
                  success: false,
                  error: errorMessage
                });
                vscode.window.showErrorMessage(`Failed to save document: ${errorMessage}`);
              }
              break;

            case 'updateContent':
              await this.updateDocument(document, message.content);
              break;

            case 'ready':
              await this.updateWebview(document, webviewPanel);
              break;
          }
        } catch (error) {
          console.error('Error handling webview message:', error);
          vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );
  }

  /**
   * Update the document with new content from the webview
   */
  private async updateDocument(
    document: vscode.TextDocument,
    htmlContent: string
  ): Promise<string> {
    if (this.isUpdating) return document.getText();

    this.isUpdating = true;
    try {
      const pandocHandler = PandocHandler.getInstance(Logger.getInstance());
      const cleanMarkdown = await pandocHandler.convertHtmlToMarkdown(htmlContent);

      // Update the document
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        cleanMarkdown
      );

      await vscode.workspace.applyEdit(edit);
      await document.save();

      return cleanMarkdown;
    } catch (error) {
      console.error('Error updating document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error saving document: ${errorMessage}`);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Update the webview with the current document content
   */
  private async updateWebview(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
    try {
      const markdown = document.getText();
      const pandocHandler = PandocHandler.getInstance(Logger.getInstance());
      const html = await pandocHandler.convertMarkdownToHtml(markdown, { mathjax: true });

      webviewPanel.webview.html = this.getWebviewContent(html);
    } catch (error) {
      console.error('Error updating webview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Error rendering document: ${errorMessage}`);
    }
  }

  /**
   * Generate the complete HTML for the webview
   */
  private getWebviewContent(html: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pandoc WYSIWYG Editor</title>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 0 20px;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
          }
          :focus { outline: 1px solid var(--vscode-focusBorder); }
        </style>
      </head>
      <body>
        <div id="editor" contenteditable="true" style="min-height: 100vh; outline: none;">
          ${html}
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          const editor = document.getElementById('editor');

          // Save content on change with debounce
          let saveTimeout;
          editor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
              vscode.postMessage({
                type: 'save',
                content: editor.innerHTML
              });
            }, 500);
          });

          // Handle messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'update') {
              editor.innerHTML = message.content;
            } else if (message.type === 'saved') {
              // Handle save confirmation if needed
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate an error view for when rendering fails
   */
  private getErrorView(error: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-errorForeground);
          }
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        <h2>Error Rendering Document</h2>
        <pre>${error}</pre>
      </body>
      </html>
    `;
  }

  /**
   * Generate a nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}