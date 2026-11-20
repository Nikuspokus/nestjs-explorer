import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { config } from '../config';
import type { NestGraph } from '../model/graph';
import { parseModules } from '../parser/module-parser';
import { loadProject } from '../parser/project-loader';
import { NestNode } from './nest-node';

export class NestTreeProvider implements vscode.TreeDataProvider<NestNode> {
  private readonly _onDidChange = new vscode.EventEmitter<NestNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly _onDidChangeGraph = new vscode.EventEmitter<void>();
  readonly onDidChangeGraph = this._onDidChangeGraph.event;

  private graph: NestGraph | undefined;
  private error: string | undefined;

  refresh(): void {
    this.graph = undefined;
    this.error = undefined;
    this._onDidChange.fire(undefined); // undefined = redessiner tout l'arbre
    this._onDidChangeGraph.fire();
  }

  /** Graphe mis en cache ; recalculé après refresh(). Sert aussi d'API pour depgraph-viewer. */
  getGraph(): NestGraph {
    if (!this.graph) {
      this.graph = { nodes: [], edges: [] };
      const tsconfig = this.findTsconfig();
      if (!tsconfig) {
        this.error = 'Aucun tsconfig.json trouvé (ou variable NEST_EXPLORER_TSCONFIG).';
      } else {
        try {
          this.graph = parseModules(loadProject(tsconfig));
        } catch (e) {
          this.error = `Analyse impossible : ${(e as Error).message}`;
        }
      }
    }
    return this.graph;
  }

  private findTsconfig(): string | undefined {
    if (config.tsconfigPath && fs.existsSync(config.tsconfigPath)) return config.tsconfigPath;
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const candidate = path.join(folder.uri.fsPath, 'tsconfig.json');
      if (fs.existsSync(candidate)) return candidate;
    }
    return undefined;
  }

  getTreeItem(node: NestNode): vscode.TreeItem {
    return node;
  }

  getChildren(node?: NestNode): NestNode[] {
    if (node) return node.children;

    const graph = this.getGraph();
    if (this.error) return [new NestNode(this.error, 'info')];

    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const modules = graph.nodes
      .filter((n) => n.kind === 'module')
      .sort((a, b) => a.label.localeCompare(b.label));
    if (modules.length === 0) return [new NestNode('Aucun @Module trouvé.', 'info')];

    return modules.map((m) => {
      const out = graph.edges.filter((e) => e.from === m.id);
      const pick = (type: string, kind: 'import' | 'controller' | 'provider') =>
        out
          .filter((e) => e.type === type && byId.get(e.to)?.kind === (kind === 'import' ? 'module' : kind))
          .map((e) => byId.get(e.to)!)
          .map((t) => new NestNode(t.label, kind, [], t));
      const children = [
        ...pick('imports', 'import'),
        ...pick('declares', 'controller'),
        ...pick('declares', 'provider'),
      ];
      return new NestNode(m.label, 'module', children, m);
    });
  }
}
