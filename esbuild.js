// Bundle = regroupe le code et ses dépendances (ts-morph) dans un seul fichier dist/extension.js.
require('esbuild')
  .build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    platform: 'node',
    format: 'cjs',
    external: ['vscode'], // fourni par VS Code à l'exécution
    sourcemap: false,
    minify: true,
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
