import * as vscode from 'vscode';
import type { NestGraph } from './model/graph';
import { config } from './config';
import { NestTreeProvider } from './tree/nest-tree-provider';
import { checkForUpdate } from './update-check';

/** API exposée aux autres extensions (ex. depgraph-viewer) via getExtension(...).exports. */
export interface NestExplorerApi {
  getGraph(): NestGraph;
  onDidChangeGraph: vscode.Event<void>;
}

export function activate(context: vscode.ExtensionContext): NestExplorerApi {
  const provider = new NestTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('nestExplorer.modules', provider),
    vscode.commands.registerCommand('nestExplorer.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('nestExplorer.openNode', async (filePath: string, line: number) => {
      const doc = await vscode.workspace.openTextDocument(filePath);
      const pos = new vscode.Position(Math.max(0, line - 1), 0);
      await vscode.window.showTextDocument(doc, { selection: new vscode.Range(pos, pos) });
    }),
  );

  if (config.updateCheck) void checkForUpdate(context); // sans await : ne bloque pas l'activation

  return {
    getGraph: () => provider.getGraph(),
    onDidChangeGraph: provider.onDidChangeGraph,
  };
}

export function deactivate(): void {}
