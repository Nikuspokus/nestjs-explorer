// Modèle de graphe : aucun import 'vscode' ici, pour rester réutilisable (depgraph-viewer, tests).

export type NodeKind = 'module' | 'controller' | 'provider';
export type EdgeType = 'imports' | 'declares' | 'injects';

export interface GraphNode {
  id: string; // `${filePath}#${ClassName}`, unique et stable
  kind: NodeKind;
  label: string; // nom de la classe
  filePath: string; // chemin absolu du fichier
  line: number; // ligne (1-based) de la déclaration, pour ouvrir au bon endroit
}

export interface GraphEdge {
  from: string; // id du nœud source
  to: string; // id du nœud cible
  type: EdgeType; // imports : module→module, declares : module→controller/provider
}

export interface NestGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
