#!/usr/bin/env python3
"""Assemble le HTML du PDF de recette, écrit pour le client, à partir de scenarios.json.

Usage :
    python3 generer-pdf.py <scenarios.json> <dossier images> <sortie.html> [--ko en-cours]

scenarios.json (textes rédigés pour le client, sans terme technique) :
    {
      "titre": "Recette — <feature>",
      "sous_titre": "Passage du <date> · <environnement> · données fictives",
      "synthese": "<html, à la première personne>",
      "parcours": {"A": "<nom du parcours>", ...},
      "scenarios": [
        {"id": "A1", "titre": "...", "resultat": "OK|KO|Non joué", "captures": ["01", "02"], "legende": "<constat en clair>"}
      ]
    }

Les images (préparées par preparer-captures.py) sont retrouvées par leur numéro : « 07-a5-....jpg » pour « 07 ».
Les scénarios non joués n'apparaissent pas (la synthèse les compte) ; les autres portent l'étiquette « Conforme ».
Un KO arrête le script, sauf --ko en-cours (scénario montré « En cours de correction », sur accord de l'utilisateur).
Impression : <chrome> --headless --no-pdf-header-footer --print-to-pdf=<sortie.pdf> <sortie.html>
"""
import argparse
import html
import json
import os
import pathlib
import sys

GABARIT = pathlib.Path(__file__).with_name("gabarit-pdf.html")


def nettoyer(texte: str) -> str:
    """Retire les marques internes (★), que les polices de Chrome sans interface n'ont souvent pas."""
    return texte.replace(" ★", "").replace("★", "")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenarios", type=pathlib.Path)
    parser.add_argument("images", type=pathlib.Path)
    parser.add_argument("sortie", type=pathlib.Path)
    parser.add_argument("--ko", choices=["arret", "en-cours"], default="arret")
    args = parser.parse_args()

    donnees = json.loads(args.scenarios.read_text(encoding="utf-8"))
    scenarios = [s for s in donnees["scenarios"] if s["resultat"] != "Non joué"]

    ko = [s["id"] for s in scenarios if s["resultat"] == "KO"]
    if ko and args.ko == "arret":
        print(f"KO présents ({', '.join(ko)}) : demander à l'utilisateur d'attendre la correction ou de les montrer (--ko en-cours).", file=sys.stderr)
        return 2
    sans_legende = [s["id"] for s in scenarios if not s.get("legende")]
    if sans_legende:
        print(f"Légende manquante : {', '.join(sans_legende)}", file=sys.stderr)
        return 2

    images = sorted(p.name for p in args.images.glob("*.jpg"))
    absentes = [f"{s['id']}:{n}" for s in scenarios for n in s.get("captures", []) if not any(i.split("-")[0] == n for i in images)]
    if absentes:
        print(f"Captures introuvables : {', '.join(absentes)}", file=sys.stderr)
        return 2

    gabarit = GABARIT.read_text(encoding="utf-8")
    style = gabarit[gabarit.index("<style>"):gabarit.index("</style>") + len("</style>")]
    chemin_images = pathlib.Path(os.path.relpath(args.images, args.sortie.parent)).as_posix()
    e = lambda t: html.escape(nettoyer(t))

    def etiquette(resultat: str) -> str:
        if resultat == "KO":
            return "<span class='etiquette en-cours'>En cours de correction</span>"
        return "<span class='etiquette ok'>Conforme</span>"

    def images_de(s: dict) -> list:
        trouvees = []
        for numero in s.get("captures", []):
            trouvees += [i for i in images if i.split("-")[0] == numero]
        return trouvees

    h = [f"<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>{e(donnees['titre'])}</title>{style}</head><body>",
         f"<header class='titre'><h1>{e(donnees['titre'])}</h1><div class='sous-titre'>{e(donnees['sous_titre'])}</div></header>",
         f"<section><h2>Synthèse</h2><div class='encadre'>{nettoyer(donnees['synthese'])}</div>",
         "<table><thead><tr><th>Scénario</th><th>Résultat</th><th>Captures</th></tr></thead><tbody>"]
    for s in scenarios:
        h.append(f"<tr><td>{e(s['id'])} — {e(s['titre'])}</td><td>{etiquette(s['resultat'])}</td><td>{', '.join(s.get('captures', [])) or '—'}</td></tr>")
    h.append("</tbody></table></section>")

    courant = None
    for s in scenarios:
        lettre = s["id"][0]
        if lettre != courant:
            if courant:
                h.append("</section>")
            h.append(f"<section class='parcours'><h2>{e(donnees['parcours'].get(lettre, lettre))}</h2>")
            courant = lettre
        titre = f"{e(s['id'])} — {e(s['titre'])} {etiquette(s['resultat'])}"
        trouvees = images_de(s)
        if not trouvees:
            h.append(f"<div class='encadre'><b>{titre}</b><br>{e(s['legende'])}</div>")
            continue
        for k, image in enumerate(trouvees):
            entete = titre if k == 0 else f"{e(s['id'])} (suite)"
            h.append(f"<figure class='resultat'><h3>{entete}</h3><img src='{chemin_images}/{image}' alt=''>"
                     f"<figcaption>{e(s['legende']) if k == len(trouvees) - 1 else ''}</figcaption></figure>")
    if courant:
        h.append("</section>")
    h.append("</body></html>")

    args.sortie.write_text("\n".join(h), encoding="utf-8")
    print(f"{args.sortie} : {len(scenarios)} scénario(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
