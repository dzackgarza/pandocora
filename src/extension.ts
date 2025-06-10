import * as vscode from 'vscode';
import * as cp from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'pandocora.editor',
      new PandocCustomEditor(context),
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: true,
      },
    ),
  );
}

class PandocCustomEditor implements vscode.CustomTextEditorProvider {
  constructor(private readonly _context: vscode.ExtensionContext) {}
  // The _context is used in the resolveCustomTextEditor method

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken, // Required by interface
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'media')],
    };

    const updateWebview = () => {
      const md = document.getText();
      this.convertMarkdownToHtml(md)
        .then((html) => {
          webviewPanel.webview.html = this.getHtmlForWebview(html, webviewPanel.webview);
        })
        .catch((err) => {
          webviewPanel.webview.html = `<body><pre>Error running Pandoc:\n${err}</pre></body>`;
        });
    };

    updateWebview();

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'alert':
          vscode.window.showInformationMessage(message.text);
          break;
      }
    });
  }

  private convertMarkdownToHtml(md: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pandoc = cp.spawn('pandoc', ['--from=commonmark', '--to=html', '--mathjax']);

      let stdout = '';
      let stderr = '';

      pandoc.stdout.on('data', (chunk) => (stdout += chunk));
      pandoc.stderr.on('data', (chunk) => (stderr += chunk));

      pandoc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(stderr || `Pandoc exited with code ${code}`);
        }
      });

      pandoc.stdin.write(md);
      pandoc.stdin.end();
    });
  }

  private getBuildTimestamp(): string {
    return Date.now().toString();
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `Built 1 ${unit} ago` : `Built ${interval} ${unit}s ago`;
      }
    }

    return 'Just now';
  }

  private getHtmlForWebview(htmlBody: string, _webview: vscode.Webview): string {
    // _webview is kept for future use
    const mathjaxCdn = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    const buildTime = this.getBuildTimestamp();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:;" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="${mathjaxCdn}"></script>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; padding: 1rem; position: relative; }
          div.theorem { border-left: 3px solid #007acc; padding-left: 1em; margin: 1em 0; background-color: #f0f8ff; }
          
          /* DEBUG_SPINNER - NEVER REMOVE - Critical debug element */
          #debug-container {
            position: fixed;
            top: 10px;
            right: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 0, 0, 0.7);
            padding: 4px 8px;
            border-radius: 4px;
            z-index: 10000;
          }
          
          #DEBUG_SPINNER {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(0, 255, 0, 0.3);
            border-radius: 50%;
            border-top-color: #0f0;
            animation: spin 1s ease-in-out infinite;
            box-shadow: 0 0 10px #0f0, 0 0 20px #0f0, 0 0 30px #0f0;
            flex-shrink: 0;
          }
          
          #build-time {
            color: #0f0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 12px;
            text-shadow: 0 0 5px #0f0;
            white-space: nowrap;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <!-- DEBUG CONTAINER - NEVER REMOVE - Critical debug elements -->
        <div id="debug-container" title="Debug Mode Active">
          <div id="DEBUG_SPINNER"></div>
          <div id="build-time" data-timestamp="${buildTime}">Just built</div>
        </div>
        <script>
          function updateBuildTime() {
            const element = document.getElementById('build-time');
            if (element) {
              const timestamp = parseInt(element.getAttribute('data-timestamp') || '0');
              const now = Date.now();
              const seconds = Math.floor((now - timestamp) / 1000);
              
              const intervals = {
                year: 31536000,
                month: 2592000,
                week: 604800,
                day: 86400,
                hour: 3600,
                minute: 60,
                second: 1
              };

              for (const [unit, secondsInUnit] of Object.entries(intervals)) {
                const interval = Math.floor(seconds / secondsInUnit);
                if (interval >= 1) {
                  element.textContent = interval === 1 
                    ? 'Built 1 ' + unit + ' ago'
                    : 'Built ' + interval + ' ' + unit + 's ago';
                  break;
                }
              }
            }
          }
          
          // Update immediately and then every minute
          updateBuildTime();
          setInterval(updateBuildTime, 60000);
        </script>
        ${htmlBody}
      </body>
      </html>`;
  }
}
