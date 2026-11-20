// Génère le dossier site/ publié sur GitHub Pages :
//   <name>-latest.vsix  (URL stable) · latest.json (lu par l'extension) · index.html (page de téléchargement)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const { name, version, displayName = name, description = '', homepage, repository } = pkg;

if (!homepage) throw new Error('package.json : "homepage" manquant (URL de la page GitHub Pages).');
if (process.env.TAG && process.env.TAG !== `v${version}`) {
  throw new Error(`Tag ${process.env.TAG} ≠ version ${version} de package.json.`);
}

const base = homepage.replace(/\/$/, '');
const repoUrl = (typeof repository === 'string' ? repository : repository?.url ?? '').replace(/\.git$/, '');
const vsix = `${name}-${version}.vsix`;
const latestVsix = `${name}-latest.vsix`;

mkdirSync('site', { recursive: true });
copyFileSync(vsix, `site/${latestVsix}`);

const latest = { name, version, url: `${base}/${latestVsix}`, date: new Date().toISOString() };
writeFileSync('site/latest.json', JSON.stringify(latest, null, 2));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
writeFileSync(
  'site/index.html',
  `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(displayName)}</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:42rem;margin:3rem auto;padding:0 1rem;color:#1f2328}
  a.btn{display:inline-block;padding:.6rem 1rem;border-radius:.4rem;background:#0969da;color:#fff;text-decoration:none}
  pre{background:#f6f8fa;padding:.8rem;border-radius:.4rem;overflow:auto}
  small{color:#59636e}
</style></head><body>
<h1>${esc(displayName)}</h1>
<p>${esc(description)}</p>
<p><a class="btn" href="${esc(latestVsix)}">Télécharger v${esc(version)}</a></p>
<h2>Installation</h2>
<pre>code --install-extension ${esc(latestVsix)}</pre>
<p>Ou : Extensions → menu « … » → « Install from VSIX… ». Les mises à jour suivantes sont proposées dans VS Code.</p>
<p><small>${repoUrl ? `<a href="${esc(repoUrl)}/releases">Toutes les versions</a> · ` : ''}mis à jour le ${esc(latest.date.slice(0, 10))}</small></p>
</body></html>
`,
);
console.log(`site/ prêt : ${name} v${version}`);
