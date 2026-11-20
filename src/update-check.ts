import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface LatestInfo { name: string; version: string; url: string; }

/** Compare deux versions « x.y.z » : vrai si a est strictement plus récente que b. */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

/**
 * Lit <homepage>/latest.json (publié par le workflow). Si une version plus récente existe,
 * propose de télécharger le .vsix puis de l'installer via la commande native « Install from VSIX ».
 * Silencieux en cas d'échec (hors ligne, page absente) : une mise à jour ne doit jamais gêner.
 */
export async function checkForUpdate(context: vscode.ExtensionContext): Promise<void> {
  const pkg = context.extension.packageJSON as { homepage?: string; version: string; displayName?: string };
  if (!pkg.homepage) return;
  try {
    const res = await fetch(`${pkg.homepage.replace(/\/$/, '')}/latest.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return;
    const latest = (await res.json()) as LatestInfo;
    if (!isNewer(latest.version, pkg.version)) return;

    const label = pkg.displayName ?? latest.name;
    const choice = await vscode.window.showInformationMessage(
      `${label} ${latest.version} est disponible (installée : ${pkg.version}).`,
      'Installer',
      'Plus tard',
    );
    if (choice !== 'Installer') return;

    const download = await fetch(latest.url);
    if (!download.ok) throw new Error(`HTTP ${download.status}`);
    const file = path.join(os.tmpdir(), `${latest.name}-${latest.version}.vsix`);
    fs.writeFileSync(file, Buffer.from(await download.arrayBuffer()));
    await vscode.commands.executeCommand('workbench.extensions.command.installFromVSIX', vscode.Uri.file(file));

    const reload = await vscode.window.showInformationMessage(`${label} ${latest.version} installée.`, 'Recharger');
    if (reload === 'Recharger') await vscode.commands.executeCommand('workbench.action.reloadWindow');
  } catch (e) {
    console.warn(`[${pkg.displayName ?? 'extension'}] vérification de mise à jour impossible :`, e);
  }
}
