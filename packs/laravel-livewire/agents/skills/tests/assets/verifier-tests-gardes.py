#!/usr/bin/env python3
"""Vérifie que les tests qui gardent les règles de la spec parallèle (ligne « Gardé par ») existent encore.

Usage (depuis la racine du projet) :
    python3 -I .agents/skills/tests/assets/verifier-tests-gardes.py [--spec .agents/specs/spec-parallele.md] [--tests tests]

Pour chaque entrée en vigueur, lit la ligne `> **Gardé par**` et résout chaque référence entre backticks :
- `Classe::test_methode` : la méthode existe dans la classe de test (fichier `<Classe>.php` sous le dossier des tests) ;
- `Classe::test_prefixe…` ou `Classe::test_e1…e5` : une méthode de la classe commence par le texte avant « … » ;
- `…_suite_du_nom` ou `e3b…` (sans « :: ») : une méthode de la dernière classe citée contient ce fragment ;
- `ClasseTest` seule : la classe de test existe.
Une référence `Classe::methode` dont la classe n'est pas un test est signalée (« Gardé par » ne cite que des tests).
Les parenthèses qui citent un test supprimé (« … supprimé `…` ») sont ignorées.
Projet à convention `feature` (« Gardé par » cite la feature, pas des tests) : contrôle sans objet.
Code de sortie 1 s'il y a un écart.
"""
import argparse
import collections
import pathlib
import re
import sys


def index_tests(dossier: pathlib.Path) -> dict:
    methodes = collections.defaultdict(set)
    for fichier in dossier.rglob("*.php"):
        texte = fichier.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"function\s+(\w+)\s*\(", texte):
            methodes[fichier.stem].add(m.group(1))
    return methodes


def convention(spec: str) -> str:
    """Convention déclarée dans « Statuts & types » ; à défaut, déduite des entrées."""
    declaree = re.search(r"\*\*Gardé par\*\*\s*\(convention du projet\)\s*:\s*`(\w+)`", spec)
    if declaree:
        return declaree.group(1)
    lignes = re.findall(r"(?m)^>\s*\*\*Gardé par\*\*\s*:\s*(.*)$", spec)
    tests = sum("::" in l for l in lignes)
    features = sum("DONE-" in l for l in lignes)
    return "feature" if features > tests else "tests"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", type=pathlib.Path, default=pathlib.Path(".agents/specs/spec-parallele.md"))
    parser.add_argument("--tests", type=pathlib.Path, default=pathlib.Path("tests"))
    args = parser.parse_args()

    spec = args.spec.read_text(encoding="utf-8")
    if convention(spec) == "feature":
        print(f"[--] {args.spec} : convention « feature » (« Gardé par » cite la feature, pas des tests) — contrôle sans objet")
        return 0
    methodes = index_tests(args.tests)
    ecarts = []
    for entree in re.split(r"(?m)^(?=### SP-)", spec)[1:]:
        ident = re.match(r"### (SP-[A-Z0-9]+-\d+)", entree)
        if not ident:
            continue
        statut = re.search(r"(?m)^>\s*\*\*Statut\*\*\s*:\s*(.*)$", entree)
        if statut and "caduc" in statut.group(1).lower():
            continue
        garde = re.search(r"(?m)^>\s*\*\*Gardé par\*\*\s*:\s*(.*)$", entree)
        if not garde:
            continue
        ligne = re.sub(r"\([^()]*supprim[^()]*\)", "", garde.group(1))
        derniere = None
        for jeton in re.findall(r"`([^`]+)`", ligne):
            jeton = jeton.strip().rstrip("()")
            if "::" in jeton:
                classe, methode = jeton.split("::", 1)
                classe = classe.split("\\")[-1].strip()
                if classe not in methodes:
                    ecarts.append((ident.group(1), jeton, "pas une classe de test du dossier des tests"))
                    derniere = None
                    continue
                derniere = classe
                if "…" in methode:
                    debut = methode.split("…", 1)[0]
                    trouve = any(m.startswith(debut) for m in methodes[classe])
                else:
                    trouve = methode in methodes[classe]
                if not trouve:
                    ecarts.append((ident.group(1), jeton, f"méthode introuvable dans {classe}"))
            elif re.fullmatch(r"[A-Z]\w*Test", jeton):
                derniere = jeton
                if jeton not in methodes:
                    ecarts.append((ident.group(1), jeton, "classe de test introuvable"))
            elif "…" in jeton and derniere:
                fragment = max(jeton.split("…"), key=len).strip("_ ")
                if fragment and not any(fragment in m for m in methodes[derniere]):
                    ecarts.append((ident.group(1), jeton, f"aucune méthode de {derniere} ne contient « {fragment} »"))

    for ident, jeton, raison in ecarts:
        print(f"{ident} : `{jeton}` — {raison}")
    print(f"[{'KO' if ecarts else 'ok'}] tests qui gardent les règles de {args.spec} : {len(ecarts)} écart(s)")
    return 1 if ecarts else 0


if __name__ == "__main__":
    sys.exit(main())
