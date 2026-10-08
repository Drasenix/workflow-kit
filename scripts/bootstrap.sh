#!/usr/bin/env bash
#
# Materialise le workflow-kit dans un projet (mode lien par defaut).
#
# Mode Link (defaut) : .opencode/ est un SYMLINK vers <KitRoot>/core.
# Mode Copy          : core/ est COPIE dans .opencode/.
#
# Seeds projet -> .agents/ (quarantaine si existe dans .agents/doublons/).
#
# Usage : ./scripts/bootstrap.sh [TARGET]
#   STACK=<nom> PROJECT_NAME=<nom> MODE=copy ON_CONFLICT=overwrite ./scripts/bootstrap.sh [TARGET]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT_ROOT="$(dirname "$SCRIPT_DIR")"
TARGET="${1:-$(pwd)}"
ON_CONFLICT="${ON_CONFLICT:-quarantine}"
PROJECT_NAME="${PROJECT_NAME:-}"
DATE="${DATE:-$(date +%F)}"
STACK="${STACK:-}"
MODE="${MODE:-link}"

if [[ -z "$STACK" && -f "$KIT_ROOT/workflow.config.json" ]]; then
  STACK="$(sed -n 's/.*"stack"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$KIT_ROOT/workflow.config.json" | head -1)"
fi
STACK="${STACK:-laravel-livewire}"

PACK_DIR="$KIT_ROOT/packs/$STACK"
if [[ ! -d "$PACK_DIR" ]]; then echo "Erreur : pack introuvable : $PACK_DIR" >&2; exit 1; fi

mkdir -p "$TARGET"; TARGET="$(cd "$TARGET" && pwd)"
KIT_ROOT="$(cd "$KIT_ROOT" && pwd)"
OPENCODE_DIR="$TARGET/.opencode"
AGENTS_DIR="$TARGET/.agents"
DOUBLONS_ROOT="$AGENTS_DIR/doublons"
PLACE_CONFLICTS=()
PLACED=()

place_file() {
  local src="$1" dst="$2" scope="${3:-project}" content rel qdst
  content="$(cat "$src"; printf x)"; content="${content%x}"
  if [[ -n "$PROJECT_NAME" ]]; then content="${content//<Projet>/$PROJECT_NAME}"; fi
  content="${content//YYYY-MM-DD/$DATE}"

  if [[ "$scope" != "agnostic" && -e "$dst" && "$ON_CONFLICT" != "overwrite" ]]; then
    rel="${dst#"$TARGET"/}"
    qdst="$DOUBLONS_ROOT/$rel"
    mkdir -p "$(dirname "$qdst")"
    printf '%s' "$content" > "$qdst"
    PLACE_CONFLICTS+=("$rel")
    return
  fi
  mkdir -p "$(dirname "$dst")"
  printf '%s' "$content" > "$dst"
  PLACED+=("$dst")
}

copy_tree() {
  local srcRoot="$1" dstRoot="$2" scope="$3" f rel
  [[ -d "$srcRoot" ]] || return 0
  while IFS= read -r f; do
    rel="${f#"$srcRoot"/}"
    place_file "$f" "$dstRoot/$rel" "$scope"
  done < <(find "$srcRoot" -type f)
}

# 1. seeds -> .agents/
copy_tree "$PACK_DIR/agents" "$AGENTS_DIR" project
echo "[pack:$STACK] agents/ -> .agents/ [project]"
copy_tree "$KIT_ROOT/project/agents" "$AGENTS_DIR" project
echo "[project] agents/ -> .agents/ [project]"
if [[ -f "$KIT_ROOT/project/AGENTS.md" ]]; then
  place_file "$KIT_ROOT/project/AGENTS.md" "$TARGET/AGENTS.md" project
  echo "[project] AGENTS.md -> AGENTS.md [project]"
fi

# 2. migration anciens .opencode/ techno -> .agents/
LEGACY_OLD=( "agent-frontend.md" "agent-livewire.md" "templates-index.md" "doc/reference-utilitaires.md" "templates/backend" "templates/frontend" "templates/tests" "skills/tests" "skills/recette" "skills/migrate-fresh" )
LEGACY_NEW=( "ui-rules.md" "component-rules.md" "templates-index.md" "reference-utilitaires.md" "templates/backend" "templates/frontend" "templates/tests" "skills/tests" "skills/recette" "skills/migrate-fresh" )
moved=0
for i in "${!LEGACY_OLD[@]}"; do
  old="$OPENCODE_DIR/${LEGACY_OLD[$i]}"
  new="$AGENTS_DIR/${LEGACY_NEW[$i]}"
  [[ -e "$old" ]] || continue
  if [[ -e "$new" ]]; then
    seed="$DOUBLONS_ROOT/_seeds/${LEGACY_NEW[$i]}"
    mkdir -p "$(dirname "$seed")"; mv "$new" "$seed"
  fi
  mkdir -p "$(dirname "$new")"; mv "$old" "$new"
  moved=$((moved+1))
done
[[ $moved -gt 0 ]] && echo "[migration] $moved chemin(s) .opencode/ migre(s) vers .agents/"

# 3. .opencode : lien (link) ou copie (copy)
if [[ "$MODE" == "link" ]]; then
  if [[ -e "$OPENCODE_DIR" && ! -L "$OPENCODE_DIR" ]]; then
    if [[ -d "$OPENCODE_DIR/feature" && ! -e "$AGENTS_DIR/feature" ]]; then
      mkdir -p "$AGENTS_DIR"; mv "$OPENCODE_DIR/feature" "$AGENTS_DIR/feature"
      echo "[migration] .opencode/feature -> .agents/feature"
    fi
    if [[ -d "$OPENCODE_DIR/doc" ]]; then
      mkdir -p "$AGENTS_DIR/doc"
      for f in "$OPENCODE_DIR/doc"/*; do
        [[ -e "$f" ]] || continue
        b="$(basename "$f")"; [[ -e "$AGENTS_DIR/doc/$b" ]] || mv "$f" "$AGENTS_DIR/doc/$b"
      done
      echo "[migration] .opencode/doc -> .agents/doc"
    fi
    rm -rf "$OPENCODE_DIR"
  elif [[ -L "$OPENCODE_DIR" ]]; then
    rm -f "$OPENCODE_DIR"
  fi
  ln -s "$KIT_ROOT/core" "$OPENCODE_DIR"
  echo "[link] .opencode -> $KIT_ROOT/core"
else
  while IFS= read -r f; do
    rel="${f#"$KIT_ROOT/core"/}"
    [[ "$rel" == "opencode.agent.json" ]] && continue
    place_file "$f" "$OPENCODE_DIR/$rel" agnostic
  done < <(find "$KIT_ROOT/core" -type f)
  echo "[core] -> .opencode/ [agnostic]"
fi

# 4. jetons non resolus (fichiers ecrits)
leftover=""
for f in "${PLACED[@]:-}"; do
  [[ -f "$f" ]] || continue
  m="$(grep -nE '\{\{[A-Z0-9_]+\}\}|<Projet>|YYYY-MM-DD' "$f" 2>/dev/null || true)"
  [[ -n "$m" ]] && leftover+="$f: $m"$'\n'
done
if [[ -n "$leftover" ]]; then echo "[attention] jetons non resolus :" >&2; echo "$leftover" >&2; else echo "[ok] aucun jeton non resolu."; fi

# 5. rapport quarantaine
if [[ ${#PLACE_CONFLICTS[@]} -gt 0 ]]; then
  mkdir -p "$DOUBLONS_ROOT"
  {
    echo "# Doublons (fichiers projet deja presents, non ecrases)"
    echo ""
    echo "La version du kit a ete deposee ici AU LIEU D'ECRASER l'existante."
    echo "Parcourez ce dossier, reportez manuellement ce qui est utile, puis supprimez-le."
    echo ""
    printf -- '- `%s`\n' "$(printf '%s\n' "${PLACE_CONFLICTS[@]}" | sort -u)"
  } > "$DOUBLONS_ROOT/README.md"
  echo "[attention] ${#PLACE_CONFLICTS[@]} fichier(s) projet deja present(s) : quarantaine dans .agents/doublons/"
fi

echo "[ok] materialisation terminee (mode $MODE)."
