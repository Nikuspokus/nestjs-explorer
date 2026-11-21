import * as path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadProject } from '../src/parser/project-loader';
import { parseModules } from '../src/parser/module-parser';
import type { NestGraph } from '../src/model/graph';

// Chemin court d'un nœud : `orders/orders.module.ts#OrdersModule`
const short = (id: string) => id.split('/src/')[1] ?? id;

let graph: NestGraph;
const edges = () => graph.edges.map((e) => `${short(e.from)} --${e.type}--> ${short(e.to)}`);

beforeAll(() => {
  const tsconfig = path.resolve(__dirname, '../test-fixtures/sample-nest-app/tsconfig.json');
  graph = parseModules(loadProject(tsconfig));
});

describe('parseModules sur la fixture sample-nest-app', () => {
  it('trouve les 10 nœuds et les 10 arêtes attendus', () => {
    expect(graph.nodes).toHaveLength(10);
    expect(graph.edges).toHaveLength(10);
  });

  it('classe les nœuds par type', () => {
    const count = (kind: string) => graph.nodes.filter((n) => n.kind === kind).length;
    expect(count('module')).toBe(3);
    expect(count('controller')).toBe(3);
    expect(count('provider')).toBe(4);
  });

  it('relie les modules entre eux par « imports »', () => {
    expect(edges()).toContain('app.module.ts#AppModule --imports--> users/users.module.ts#UsersModule');
    expect(edges()).toContain('app.module.ts#AppModule --imports--> orders/orders.module.ts#OrdersModule');
    expect(edges()).toContain('orders/orders.module.ts#OrdersModule --imports--> users/users.module.ts#UsersModule');
  });

  it('relie un module à ses controllers et providers par « declares »', () => {
    expect(edges()).toContain('orders/orders.module.ts#OrdersModule --declares--> orders/orders.controller.ts#OrdersController');
    expect(edges()).toContain('orders/orders.module.ts#OrdersModule --declares--> orders/orders.repository.ts#OrdersRepository');
    expect(edges()).toContain('users/users.module.ts#UsersModule --declares--> users/users.service.ts#UsersService');
  });

  it('donne à chaque nœud un id unique, un fichier et une ligne', () => {
    expect(new Set(graph.nodes.map((n) => n.id)).size).toBe(graph.nodes.length);
    for (const n of graph.nodes) {
      expect(n.filePath).toMatch(/\.ts$/);
      expect(n.line).toBeGreaterThan(0);
    }
  });

  it('ne crée aucune arête vers un nœud inconnu', () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const e of graph.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });
});
