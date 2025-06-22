// tests/mocks/vscode.ts
// A very basic mock for the 'vscode' module to allow tests to run outside VS Code.

// Define a simple interface for our mock Uri to avoid 'any'
interface IMockUri {
  fsPath: string;
  path: string;
  scheme: string;
  authority: string;
  query: string;
  fragment: string;
  with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string; }): IMockUri;
  toString(skipEncoding?: boolean): string;
}

export const workspace = {
  getConfiguration: () => ({
    get: () => undefined,
  }),
  onDidChangeTextDocument: () => ({ dispose: () => {} }),
  // Add other mocked functions/objects from vscode.workspace if your code uses them at import time
};

export const window = {
  registerCustomEditorProvider: () => ({ dispose: () => {} }),
  showInformationMessage: () => {},
  // Add other mocked functions/objects from vscode.window
};

export const Uri = {
  joinPath: (...args: string[]) => args.join('/'), // Simple mock
  file: (path: string) => `file://${path}`,
  parse: (path: string) => ({
    path,
    fsPath: path,
    scheme: 'file',
    authority: '',
    query: '',
    fragment: '',
    with: function(this: IMockUri, _change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string; }): IMockUri { return this; },
    toString: function(this: IMockUri, _skipEncoding?: boolean): string { return `file://${this.path}`; },
  }),
};

export const commands = {
  executeCommand: () => Promise.resolve(),
};

export class ExtensionContext {
  subscriptions: { dispose: () => void }[] = [];
  extensionUri: IMockUri = {
    fsPath: '/mock/extension',
    path: '/mock/extension',
    scheme: 'file',
    authority: '',
    query: '',
    fragment: '',
    with: function(this: IMockUri, _change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string; }): IMockUri { return this; },
    toString: function(this: IMockUri, _skipEncoding?: boolean): string { return `file://${this.path}`; },
  };
  globalState = { get: () => {}, update: () => {} };
  workspaceState = { get: () => {}, update: () => {} };
  // Add other properties/methods if needed
}

// Mock other VS Code APIs as needed by your extension's top-level code
export class CancellationTokenSource {
  token = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };
  cancel() {}
  dispose() {}
}

export const CustomTextEditorProvider = {}; // Empty mock, or add methods if called at import time
export const WebviewPanel = {};
export const CancellationToken = {};

// Default export if your code uses `import vscode from 'vscode'`
export default {
  workspace,
  window,
  Uri,
  commands,
  ExtensionContext,
  CancellationTokenSource,
  CustomTextEditorProvider,
  WebviewPanel,
  CancellationToken,
};
