import { Project } from 'ts-morph';

/**
 * Crée un Project ts-morph (une représentation en mémoire du programme TypeScript :
 * fichiers sources, AST, résolution des symboles) à partir d'un tsconfig.json.
 * skipAddingFilesFromTsConfig=false : tous les fichiers listés par le tsconfig sont chargés.
 */
export function loadProject(tsConfigFilePath: string): Project {
  return new Project({
    tsConfigFilePath,
    skipFileDependencyResolution: true, // on ne suit pas node_modules : plus rapide
  });
}
