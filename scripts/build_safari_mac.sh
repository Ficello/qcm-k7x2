#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
EXT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUT_DIR="${1:-$EXT_DIR/safari_xcode}"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "Erreur : xcrun est introuvable. Installez Xcode depuis le Mac App Store." >&2
  exit 1
fi

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "Erreur : safari-web-extension-converter est introuvable. Lancez Xcode une premiere fois pour installer les outils CLI." >&2
  exit 1
fi

echo "Conversion de QCM Clavier en extension native Safari..."
xcrun safari-web-extension-converter "$EXT_DIR" \
  --project-location "$OUT_DIR" \
  --app-name "QCM Clavier" \
  --bundle-identifier "fr.local.qcm-clavier" \
  --macos-only \
  --no-prompt

echo ""
echo "Projet Xcode genere dans : $OUT_DIR"
echo "Etapes suivantes :"
echo "1. Dans Xcode, cliquez sur le bouton Play (Cmd+R) pour compiler et lancer l'application QCM Clavier."
echo "2. Dans Safari > Reglages > Extensions, cochez QCM Clavier et autorisez les sites (EDN.fr, Hypocampus, UNESS, Asclepia, Refoua)."
