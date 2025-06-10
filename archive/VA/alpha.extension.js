"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
class AlphaPandocEditor {
    static register(context) {
        return vscode.window.registerCustomEditorProvider(AlphaPandocEditor.viewType, new AlphaPandocEditor(context), {
            webviewOptions: { retainContextWhenHidden: true },
            supportsMultipleEditorsPerDocument: false
        });
    }
    constructor(context) {
        this.context = context;
        this.isUpdating = false;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        // Setup webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        // Initial content load
        const updateWebview = async () => {
            try {
                const md = document.getText();
                const html = await this.convertMarkdownToHtml(md);
                webviewPanel.webview.html = this.getHtmlForWebview(html, webviewPanel.webview);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                webviewPanel.webview.html = this.getErrorHtml(errorMessage);
            }
        };
        // Handle document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString() && !this.isUpdating) {
                updateWebview();
            }
        });
        // Handle webview messages
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            try {
                switch (message.command) {
                    case 'edit':
                        await this.updateDocument(document, message.content);
                        break;
                    case 'save':
                        await document.save();
                        break;
                }
            }
            catch (error) {
                console.error('Error handling webview message:', error);
            }
        });
        // Clean up
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
        // Initial render
        updateWebview();
    }
    async updateDocument(document, content) {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        this.isUpdating = true;
        edit.replace(document.uri, fullRange, content);
        await vscode.workspace.applyEdit(edit);
        this.isUpdating = false;
    }
    convertMarkdownToHtml(md) {
        return new Promise((resolve, reject) => {
            const pandoc = cp.spawn("pandoc", [
                "--from=commonmark_x+sourcepos",
                "--to=html",
                "--mathjax"
            ]);
            let stdout = "";
            let stderr = "";
            pandoc.stdout.on("data", (chunk) => (stdout += chunk.toString()));
            pandoc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
            pandoc.on("close", (code) => {
                if (code === 0) {
                    resolve(stdout);
                }
                else {
                    reject(new Error(stderr || `Pandoc exited with code ${code}`));
                }
            });
            pandoc.on("error", (err) => {
                reject(new Error(`Failed to start pandoc: ${err.message}`));
            });
            pandoc.stdin.write(md);
            pandoc.stdin.end();
        });
    }
    getHtmlForWebview(htmlBody, webview) {
        const mathjaxCdn = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" 
              content="default-src 'none'; 
                      script-src 'nonce-${nonce}' 'unsafe-inline' ${webview.cspSource} https:; 
                      style-src 'unsafe-inline' ${webview.cspSource} https:; 
                      img-src ${webview.cspSource} https: data:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script nonce="${nonce}" src="${mathjaxCdn}"></script>
        <style nonce="${nonce}">
          body { 
            font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif); 
            line-height: 1.6; 
            padding: 20px; 
            max-width: 800px; 
            margin: 0 auto; 
          }
          #editor { 
            min-height: 100vh;
            outline: none;
          }
          :focus {
            outline: 2px solid var(--vscode-focusBorder, #007fd4);
            outline-offset: 2px;
          }
          div.theorem { 
            border-left: 3px solid #007acc; 
            padding: 0.5em 1em; 
            margin: 1em 0; 
            background-color: rgba(0, 122, 204, 0.05);
            border-radius: 0 4px 4px 0;
          }
        </style>
      </head>
      <body>
        <div id="editor" contenteditable="true">${htmlBody}</div>
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
          const editor = document.getElementById('editor');
          let isUpdating = false;
          let lastContent = editor.innerHTML;

          // Handle content changes
          editor.addEventListener('input', () => {
            if (isUpdating) return;
            const content = editor.innerHTML;
            if (content !== lastContent) {
              lastContent = content;
              vscode.postMessage({
                command: 'edit',
                content: content
              });
            }
          });

          // Handle save command
          document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              vscode.postMessage({
                command: 'save'
              });
            }
          });

          // Handle focus
          editor.addEventListener('focus', () => {
            editor.setAttribute('contenteditable', 'true');
          });
        </script>
      </body>
      </html>`;
    }
    getErrorHtml(error) {
        return `<!DOCTYPE html>
      <html>
      <body>
        <h1>Error</h1>
        <pre>${error}</pre>
      </body>
      </html>`;
    }
    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
AlphaPandocEditor.viewType = 'pandoc-wysiwyg.alpha';
// This method is called when your extension is activated
function activate(context) {
    console.log('Activating Pandoc WYSIWYG');
    // Register our custom editor provider
    context.subscriptions.push(AlphaPandocEditor.register(context));
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('pandoc-wysiwyg.openAsPandoc', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const document = activeEditor.document;
        if (document.languageId !== 'markdown') {
            vscode.window.showErrorMessage('Active document is not a Markdown file');
            return;
        }
        // Open the document in our custom editor
        await vscode.commands.executeCommand('vscode.openWith', document.uri, 'pandoc-wysiwyg.alpha', vscode.ViewColumn.Beside);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('pandoc-wysiwyg.alphaStart', () => {
        new AlphaPandocEditor(context);
    }));
}
// This method is called when your extension is deactivated
function deactivate() {
    // Clean up any resources if needed
}
//# sourceMappingURL=alpha.extension.js.map