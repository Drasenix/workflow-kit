import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { exists, readUtf8, writeUtf8 } from './util.mjs';
import { declares } from './verifier-utilitaires.mjs';

/**
 * Conventions exécutables : une règle d'un fichier-rôle est un test, ou elle est déclarée non mécanisable.
 * - Un fichier-rôle s'y soumet par la ligne `> **Règles étiquetées** : …` avant sa première section.
 * - Une règle : puce de premier niveau, ou ligne de données d'un tableau. Son bloc (puce et lignes indentées qui suivent)
 *   porte `Gardée par : `<chemin>::<test>`` (un ou plusieurs) ou `Non mécanisable : <raison>`.
 * - Le sommaire des règles (`.agents/regles-architecture.md`) est généré depuis les lignes `Règle :` des tests
 *   d'architecture : le test reste la seule source.
 */
export const DECLARATION = /^>\s*\*\*R[èe]gles [ée]tiquet[ée]es\*\*/m;
export const SOMMAIRE_REGLES = '.agents/regles-architecture.md';
const GARDEE = /Gard[ée]e par\s*:/i;
const NON_MECA = /Non m[ée]canisable[^:*`]{0,30}:/i; // précision admise : « en l'état », « par un test »

/** Règles d'un fichier-rôle déclaré : `{ n, text, bloc }`, `bloc` = texte de la règle (puce et suite indentée, ou ligne de tableau). */
export function reglesDe(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const regles = [];
  let fence = false;
  let courante = null;
  let tableau = 0; // rang de la ligne dans le tableau en cours (1 = en-tête, 2 = séparateur)
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) fence = !fence;
    if (/^\|/.test(line)) {
      tableau++;
      courante = null;
      if (tableau > 2 && !fence) regles.push({ n: i + 1, text: line, bloc: line });
      return;
    }
    tableau = 0;
    if (/^- /.test(line) && !fence) {
      courante = { n: i + 1, text: line, bloc: line };
      regles.push(courante);
      return;
    }
    if (courante && (fence || /^\s+\S/.test(line))) courante.bloc += `\n${line}`;
    else if (!line.trim()) {
      /* ligne vide : la règle peut continuer (bloc de code indenté) */
    } else courante = null;
  });
  return regles;
}

const projetFichiers = (root) => {
  try {
    return execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

/** Étiquettes des fichiers-rôles déclarés : `[{ file, problems }]`. */
export function checkEtiquettes(root) {
  const agents = path.join(root, '.agents');
  if (!exists(agents)) return [];
  const fichiers = new Set(projetFichiers(root));
  const out = [];
  for (const nom of execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '.agents'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter((f) => /^\.agents\/[^/]+\.md$/.test(f))) {
    const text = readUtf8(path.join(root, nom));
    if (!DECLARATION.test(text.split(/^## /m)[0])) continue;
    const problems = [];
    for (const r of reglesDe(text)) {
      const gardee = GARDEE.test(r.bloc);
      if (!gardee && !NON_MECA.test(r.bloc)) {
        problems.push(`l.${r.n} : règle sans étiquette (« Gardée par : … » ou « Non mécanisable : … ») : « ${r.text.slice(0, 70)}${r.text.length > 70 ? '…' : ''} »`);
        continue;
      }
      if (!gardee) continue;
      const apres = r.bloc.slice(r.bloc.search(GARDEE));
      // un test cité est un fichier (extension), éventuellement suivi de `::méthode` ; un dossier cité en précision n'en est pas un
      const jetons = [...apres.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((t) => /\/[^/]*\.[A-Za-z0-9]+(::|$)/.test(t));
      if (!jetons.length) problems.push(`l.${r.n} : « Gardée par » sans test cité (\`<chemin>::<test>\`)`);
      for (const t of jetons) {
        const [fichier, methode] = t.split('::');
        if (!fichiers.has(fichier)) problems.push(`l.${r.n} : test cité introuvable : \`${fichier}\``);
        else if (methode && !declares(readUtf8(path.join(root, fichier)), methode.replace(/\(.*$/, ''))) problems.push(`l.${r.n} : \`${methode}\` non déclarée dans \`${fichier}\``);
      }
    }
    out.push({ file: nom, problems });
  }
  return out;
}

/** Règles des tests d'architecture (lignes `Règle :` sous un dossier `architecture`) : `{ fichier, methode, regle }`. */
export function reglesDesTests(root) {
  const res = [];
  for (const f of projetFichiers(root).filter((f) => /(^|\/)architecture\//i.test(f) && !/(^|\/)tolerances\//.test(f) && !/^\.agents\//.test(f) && !/^workflow-kit\//.test(f))) {
    const lines = readUtf8(path.join(root, f)).split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = /R[èe]gle\s*:\s*(.+?)\s*(\*\/)?$/.exec(line);
      if (!m) return;
      let methode = null;
      for (let j = i + 1; j < Math.min(lines.length, i + 40) && !methode; j++) {
        const d = /\b(?:function|def|fn|func)\s+(\w+)|\b(?:it|test)\s*\(\s*['"]([^'"]+)['"]/.exec(lines[j]);
        if (d) methode = d[1] ?? d[2];
      }
      res.push({ fichier: f, methode, regle: m[1].replace(/\.$/, '') });
    });
  }
  return res;
}

export function buildSommaireRegles(root) {
  const out = [
    "# Règles d'architecture",
    '',
    "> Généré depuis les lignes `Règle :` des tests d'architecture par `node workflow-kit/bin/workflow-kit.mjs regles` : ne pas modifier à la main.",
    "> À lire en entier avant de concevoir (plan) : chaque règle est un test, qui échoue si on l'enfreint.",
    '',
  ];
  for (const r of reglesDesTests(root)) out.push(`- ${r.regle}. \`${r.fichier}${r.methode ? `::${r.methode}` : ''}\``);
  return out.join('\n') + '\n';
}

/** Sommaire des règles : `null` s'il n'y a aucun test d'architecture, sinon les écarts (absent, pas à jour). */
export function checkSommaireRegles(root) {
  if (!reglesDesTests(root).length) return null;
  const p = path.join(root, SOMMAIRE_REGLES);
  if (!exists(p)) return [`${SOMMAIRE_REGLES} absent : le générer (node workflow-kit/bin/workflow-kit.mjs regles)`];
  const norm = (t) => t.replace(/\r\n/g, '\n').trimEnd();
  return norm(readUtf8(p)) === norm(buildSommaireRegles(root)) ? [] : [`${SOMMAIRE_REGLES} pas à jour : le régénérer (node workflow-kit/bin/workflow-kit.mjs regles)`];
}

export function writeSommaireRegles(root) {
  writeUtf8(path.join(root, SOMMAIRE_REGLES), buildSommaireRegles(root));
  return path.join(root, SOMMAIRE_REGLES);
}
