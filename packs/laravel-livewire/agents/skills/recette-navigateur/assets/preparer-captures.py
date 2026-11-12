#!/usr/bin/env python3
"""Prépare les captures d'une recette pour le PDF.

Rogne la barre latérale (largeur fixe, en pixels) et le bas vide de chaque capture,
puis l'enregistre en JPEG dans le dossier cible. Les fichiers sources ne sont jamais
modifiés. Dépendance : Pillow.

Usage :
    python3 preparer-captures.py <dossier source> <dossier cible> [--gauche PX]
        [--marge PX] [--qualite N] [--sans-bas]
"""

import argparse
import pathlib
import sys

from PIL import Image, ImageChops


def rogner_bas(image: Image.Image, marge: int, tolerance: int = 6) -> Image.Image:
    """Retire les lignes du bas qui ont la couleur du fond (pixel en bas à droite)."""
    fond = Image.new(image.mode, image.size, image.getpixel((image.width - 1, image.height - 1)))
    ecart = ImageChops.difference(image, fond).convert("L").point(lambda v: 255 if v > tolerance else 0)
    boite = ecart.getbbox()
    if not boite:
        return image
    bas = min(image.height, boite[3] + marge)
    return image.crop((0, 0, image.width, bas))


def main() -> int:
    parser = argparse.ArgumentParser(description="Rogne les captures d'une recette pour le PDF.")
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("cible", type=pathlib.Path)
    parser.add_argument("--gauche", type=int, default=0, help="largeur de la barre latérale à retirer (px)")
    parser.add_argument("--marge", type=int, default=16, help="marge gardée sous le dernier contenu (px)")
    parser.add_argument("--qualite", type=int, default=92, help="qualité JPEG (la capture est déjà compressée : rester haut)")
    parser.add_argument("--sans-bas", action="store_true", help="ne pas rogner le bas vide")
    args = parser.parse_args()

    if not args.source.is_dir():
        print(f"Dossier source introuvable : {args.source}", file=sys.stderr)
        return 1
    if args.cible.resolve() == args.source.resolve():
        print("Le dossier cible doit différer du dossier source.", file=sys.stderr)
        return 1
    args.cible.mkdir(parents=True, exist_ok=True)

    fichiers = sorted(p for p in args.source.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    for fichier in fichiers:
        image = Image.open(fichier).convert("RGB")
        if args.gauche:
            image = image.crop((min(args.gauche, image.width - 1), 0, image.width, image.height))
        if not args.sans_bas:
            image = rogner_bas(image, args.marge)
        destination = args.cible / f"{fichier.stem}.jpg"
        image.save(destination, "JPEG", quality=args.qualite, optimize=True)
        print(f"{fichier.name} -> {destination.name} ({image.width} x {image.height})")

    print(f"{len(fichiers)} capture(s) préparée(s) dans {args.cible}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
