// Configuration par variables d'environnement (lues dans l'Extension Host).
export const config = {
  // Chemin absolu du tsconfig à analyser ; sinon <workspace>/tsconfig.json
  tsconfigPath: process.env.NEST_EXPLORER_TSCONFIG,
  // NEST_EXPLORER_UPDATE_CHECK=off désactive la vérification de mises à jour
  updateCheck: process.env.NEST_EXPLORER_UPDATE_CHECK !== 'off',
};
