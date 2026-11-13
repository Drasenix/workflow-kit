#!/usr/bin/env python3
"""Assemble le HTML du PDF de recette (mode interne ou client) à partir de scenarios.json.

Usage :
    python3 generer-pdf.py <scenarios.json> <dossier images> <sortie.html> [--mode interne|client] [--ko en-cours]

scenarios.json :
    {
      "titre": "Recette — <feature>",
      "sous_titre": "Passage du <date> · <environnement> · données fictives",
      "synthese": {"interne": "<html>", "client": "<html>"},
      "parcours": {"A": "<nom du parcours>", ...},
      "scenarios": [
        {"id": "A1", "titre": "...", "titre_client": "... (facultatif)", "resultat": "OK|KO|Non joué",
         "captures": ["01", "02"], "legende": "<constat interne>", "legende_client": "<constat en clair>"}
      ]
    }

Les images (préparées par preparer-captures.py) sont retrouvées par leur numéro : « 07-a5-....jpg » pour « 07 ».
Mode client : scénarios joués seulement, étiquette « Conforme », légendes client, marques internes retirées ;
un KO arrête le script, sauf --ko en-cours (scénario montré « En cours de correction », sur accord de l'utilisateur).
Impression : <chrome> --headless --no-pdf-header-footer --print-to-pdf=<sortie.pdf> <sortie.html>
"""
import argparse
import html
import json
import os
import pathlib
import sys

GABARIT = pathlib.Path(__file__).with_name("gabarit-pdf.html")
MARQUES = ("★",)


def nettoyer(texte: str, mode: str) -> str:
    for m in MARQUES:
        texte = texte.replace(f" {m}", "").replace(m, "") if mode == "client" else texte.replace(m, "*")
    return texte


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("scenarios", type=pathlib.Path)
    parser.add_argument("images", type=pathlib.Path)
    parser.add_argument("sortie", type=pathlib.Path)
    parser.add_argument("--mode", choices=["interne", "client"], default="interne")
    parser.add_argument("--ko", choices=["arret", "en-cours"], default="arret")
    args = parser.parse_args()

    donnees = json.loads(args.scenarios.read_text(encoding="utf-8"))
    client = args.mode == "client"
    scenarios = donnees["scenarios"]

    if client:
        ko = [s["id"] for s in scenarios if s["resultat"] == "KO"]
        if ko and args.ko == "arret":
            print(f"KO présents ({', '.join(ko)}) : demander à l'utilisateur d'attendre la correction ou de les montrer (--ko en-cours).", file=sys.stderr)
            return 2
        manquantes = [s["id"] for s in scenarios if s["resultat"] != "Non joué" and not s.get("legende_client")]
        if manquantes:
            print(f"Légende client manquante : {', '.join(manquantes)}", file=sys.stderr)
            return 2
        scenarios = [s for s in scenarios if s["resultat"] != "Non joué"]

    gabarit = GABARIT.read_text(encoding="utf-8")
    style = gabarit[gabarit.index("<style>"):gabarit.index("</style>") + len("</style>")]
    images = sorted(p.name for p in args.images.glob("*.jpg"))
    chemin_images = pathlib.Path(os.path.relpath(args.images, args.sortie.parent)).as_posix()
    e = lambda t: html.escape(nettoyer(t, args.mode))

    def etiquette(resultat: str) -> str:
        if client:
            return "<span class='etiquette en-cours'>En cours de correction</span>" if resultat == "KO" else "<span class='etiquette ok'>Conforme</span>"
        classe = {"OK": "ok", "KO": "ko"}.get(resultat, "non-joue")
        return f"<span class='etiquette {classe}'>{html.escape(resultat)}</span>"

    def titre(s: dict) -> str:
        return e(s.get("titre_client") or s["titre"]) if client else e(s["titre"])

    def images_de(s: dict) -> list:
        trouvees = []
        for numero in s.get("captures", []):
            trouvees += [i for i in images if i.split("-")[0] == numero]
        return trouvees

    absentes = [f"{s['id']}:{n}" for s in scenarios for n in s.get("captures", []) if not any(i.split("-")[0] == n for i in images)]
    if absentes:
        print(f"Captures introuvables : {', '.join(absentes)}", file=sys.stderr)
        return 2

    h = [f"<!doctype html><html lang='fr'><head><meta charset='utf-8'><title>{e(donnees['titre'])}</title>{style}</head><body>",
         f"<header class='titre'><h1>{e(donnees['titre'])}</h1><div class='sous-titre'>{e(donnees['sous_titre'])}</div></header>",
         f"<section><h2>Synthèse</h2><div class='encadre'>{nettoyer(donnees['synthese'][args.mode], args.mode)}</div>",
         "<table><thead><tr><th>Scénario</th><th>Résultat</th><th>Captures</th></tr></thead><tbody>"]
    for s in scenarios:
        h.append(f"<tr><td>{e(s['id'])} — {titre(s)}</td><td>{etiquette(s['resultat'])}</td><td>{', '.join(s.get('captures', [])) or '—'}</td></tr>")
    h.append("</tbody></table></section>")

    courant = None
    for s in scenarios:
        lettre = s["id"][0]
        if lettre != courant:
            if courant:
                h.append("</section>")
            h.append(f"<section class='parcours'><h2>{e(donnees['parcours'].get(lettre, lettre))}</h2>")
            courant = lettre
        legende = e(s["legende_client"] if client else s.get("legende", ""))
        trouvees = images_de(s)
        if not trouvees:
            h.append(f"<div class='encadre'><b>{e(s['id'])} — {titre(s)}</b> {etiquette(s['resultat'])}<br>{legende}</div>")
            continue
        for k, image in enumerate(trouvees):
            entete = f"{e(s['id'])} — {titre(s)} {etiquette(s['resultat'])}" if k == 0 else f"{e(s['id'])} (suite)"
            h.append(f"<figure class='resultat'><h3>{entete}</h3><img src='{chemin_images}/{image}' alt=''>"
                     f"<figcaption>{legende if k == len(trouvees) - 1 else ''}</figcaption></figure>")
    if courant:
        h.append("</section>")
    h.append("</body></html>")

    args.sortie.write_text("\n".join(h), encoding="utf-8")
    print(f"{args.sortie} : {len(scenarios)} scénario(s), mode {args.mode}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
