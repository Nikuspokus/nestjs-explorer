import * as path from 'node:path';
import { loadProject } from '../src/parser/project-loader';
import { parseModules } from '../src/parser/module-parser';

// Variable d'environnement NEST_EXPLORER_TSCONFIG, sinon la fixture
const tsconfig =
  process.env.NEST_EXPLORER_TSCONFIG ??
  path.resolve(__dirname, '../test-fixtures/sample-nest-app/tsconfig.json');

const graph = parseModules(loadProject(tsconfig));
const short = (id: string) => id.split('/src/')[1] ?? id;

console.log(`${graph.nodes.length} nœuds, ${graph.edges.length} arêtes`);
for (const e of graph.edges) console.log(`${short(e.from)} --${e.type}--> ${short(e.to)}`);
