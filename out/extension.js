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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
function activate(context) {
    context.subscriptions.push(vscode.window.registerCustomEditorProvider('pandocora.editor', new PandocCustomEditor(context), {
        webviewOptions: {
            retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: true,
    }));
}
class PandocCustomEditor {
    constructor(_context) {
        this._context = _context;
    }
    // The _context is used in the resolveCustomTextEditor method
    resolveCustomTextEditor(document, webviewPanel, _token) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    convertMarkdownToHtml(md) {
        return new Promise((resolve, reject) => {
            const pandoc = cp.spawn('pandoc', ['--from=commonmark', '--to=html', '--mathjax']);
            let stdout = '';
            let stderr = '';
            pandoc.stdout.on('data', (chunk) => (stdout += chunk));
            pandoc.stderr.on('data', (chunk) => (stderr += chunk));
            pandoc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                }
                else {
                    reject(stderr || `Pandoc exited with code ${code}`);
                }
            });
            pandoc.stdin.write(md);
            pandoc.stdin.end();
        });
    }
    getBuildTimestamp() {
        return Date.now().toString();
    }
    formatRelativeTime(timestamp) {
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
    getHtmlForWebview(htmlBody, _webview) {
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
//# sourceMappingURL=extension.js.map