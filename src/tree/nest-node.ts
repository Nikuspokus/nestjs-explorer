import * as vscode from 'vscode';
import type { GraphNode } from '../model/graph';

export type NestNodeKind = 'module' | 'controller' | 'provider' | 'import' | 'info';

/** Une ligne de l'arbre. `children` est précalculé : l'arbre est petit, pas besoin de chargement paresseux. */
export class NestNode extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly kind: NestNodeKind,
    public readonly children: NestNode[] = [],
    target?: GraphNode,
  ) {
    super(
      label,
      children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );
    this.contextValue = kind;
    this.iconPath = new vscode.ThemeIcon(ICONS[kind]);
    if (target) {
      this.tooltip = `${target.filePath}:${target.line}`;
      // Un clic exécute cette commande avec ces arguments : ouvre le fichier à la bonne ligne.
      this.command = {
        command: 'nestExplorer.openNode',
        title: 'Open',
        arguments: [target.filePath, target.line],
      };
    }
  }
}

const ICONS: Record<NestNodeKind, string> = {
  module: 'package',
  controller: 'globe',
  provider: 'symbol-class',
  import: 'arrow-right',
  info: 'info',
};
