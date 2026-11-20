import {
  ArrayLiteralExpression,
  CallExpression,
  ClassDeclaration,
  Expression,
  Node,
  ObjectLiteralExpression,
  Project,
} from 'ts-morph';
import type { GraphEdge, GraphNode, NestGraph, NodeKind } from '../model/graph';

const nodeId = (cls: ClassDeclaration): string =>
  `${cls.getSourceFile().getFilePath()}#${cls.getName()}`;

function toNode(cls: ClassDeclaration, kind: NodeKind): GraphNode {
  return {
    id: nodeId(cls),
    kind,
    label: cls.getName() ?? '<anonymous>',
    filePath: cls.getSourceFile().getFilePath(),
    line: cls.getStartLineNumber(),
  };
}

/**
 * Retrouve la classe désignée par une expression de tableau Nest.
 * Cas gérés :
 *  - `UsersModule`                          (identifiant simple)
 *  - `forwardRef(() => OrdersModule)`       (référence circulaire différée)
 *  - `{ provide: TOKEN, useClass: Foo }`    (provider « objet » : on prend useClass)
 * Ignorés pour ce jalon : `TypeOrmModule.forFeature([...])` (modules dynamiques), useValue/useFactory.
 */
function resolveClass(expr: Expression): ClassDeclaration | undefined {
  if (Node.isCallExpression(expr)) return resolveFromCall(expr);
  if (Node.isObjectLiteralExpression(expr)) return resolveFromProviderObject(expr);
  if (Node.isIdentifier(expr)) {
    let symbol = expr.getSymbol();
    // Un import `import { X } from './x'` donne un symbole « alias » : on le suit jusqu'à la classe.
    if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol() ?? symbol;
    return symbol?.getDeclarations().find(Node.isClassDeclaration);
  }
  return undefined;
}

function resolveFromCall(call: CallExpression): ClassDeclaration | undefined {
  if (call.getExpression().getText() !== 'forwardRef') return undefined;
  const arrow = call.getArguments()[0];
  if (!arrow || !Node.isArrowFunction(arrow)) return undefined;
  const body = arrow.getBody();
  return Node.isExpression(body) ? resolveClass(body) : undefined;
}

function resolveFromProviderObject(obj: ObjectLiteralExpression): ClassDeclaration | undefined {
  const useClass = obj.getProperty('useClass');
  if (!useClass || !Node.isPropertyAssignment(useClass)) return undefined;
  const init = useClass.getInitializer();
  return init ? resolveClass(init) : undefined;
}

/** Lit un tableau (imports/providers/controllers) de l'objet passé à @Module({...}). */
function readArray(config: ObjectLiteralExpression, key: string): ClassDeclaration[] {
  const prop = config.getProperty(key);
  if (!prop || !Node.isPropertyAssignment(prop)) return [];
  const init = prop.getInitializer();
  if (!init || !Node.isArrayLiteralExpression(init)) return [];
  return (init as ArrayLiteralExpression)
    .getElements()
    .map(resolveClass)
    .filter((c): c is ClassDeclaration => c !== undefined);
}

/**
 * Parcourt tous les fichiers du projet et construit le graphe modules → (modules, controllers, providers).
 * @Module est un décorateur de classe : une fonction qui reçoit la classe et lui attache des métadonnées.
 * Ici on n'exécute rien, on lit seulement son argument dans l'AST.
 */
export function parseModules(project: Project): NestGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const add = (cls: ClassDeclaration, kind: NodeKind): string => {
    const n = toNode(cls, kind);
    // Un module importé avant d'être visité est déjà créé : on ne l'écrase pas.
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n.id;
  };

  for (const file of project.getSourceFiles()) {
    for (const cls of file.getClasses()) {
      const decorator = cls.getDecorator('Module');
      if (!decorator) continue;

      const moduleId = add(cls, 'module');
      const arg = decorator.getArguments()[0];
      if (!arg || !Node.isObjectLiteralExpression(arg)) continue; // @Module() sans config

      for (const m of readArray(arg, 'imports')) {
        edges.push({ from: moduleId, to: add(m, 'module'), type: 'imports' });
      }
      for (const c of readArray(arg, 'controllers')) {
        edges.push({ from: moduleId, to: add(c, 'controller'), type: 'declares' });
      }
      for (const p of readArray(arg, 'providers')) {
        edges.push({ from: moduleId, to: add(p, 'provider'), type: 'declares' });
      }
    }
  }
  return { nodes: [...nodes.values()], edges };
}
