#!/usr/bin/env bash
set -e

DOWNLOADS="${HOME}/Downloads"
ZIP="${DOWNLOADS}/RevisionOS_V1.zip"
APP_DIR="${DOWNLOADS}/RevisionOS_V1"

echo "=== RevisionOS V1 - Installation & démarrage ==="

if [ ! -f "$ZIP" ]; then
  echo "ERREUR: fichier introuvable: $ZIP"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR: Node.js n'est pas installé."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERREUR: Node.js $(node -v) détecté. RevisionOS nécessite Node.js 20.9 ou plus."
  exit 1
fi

echo "Node.js détecté: $(node -v)"
echo "npm détecté: $(npm -v)"

echo "Nettoyage ancien dossier éventuel..."
rm -rf "$APP_DIR"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Extraction du projet..."
unzip -q "$ZIP" -d "$TMP_DIR"

PACKAGE=$(find "$TMP_DIR" -type f -name package.json \
  -not -path '*/node_modules/*' \
  -not -path '*/__MACOSX/*' \
  | head -n 1)

if [ -z "$PACKAGE" ]; then
  echo "ERREUR: aucun package.json trouvé dans l'archive."
  echo "Contenu principal du ZIP :"
  find "$TMP_DIR" -maxdepth 3 -type f | sed "s|$TMP_DIR/||" | head -n 80
  exit 1
fi

SOURCE_DIR=$(dirname "$PACKAGE")
echo "Projet détecté dans : ${SOURCE_DIR#$TMP_DIR/}"

mkdir -p "$APP_DIR"
cp -a "$SOURCE_DIR/." "$APP_DIR/"
cd "$APP_DIR"

if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  echo ".env.local créé depuis .env.example"
fi

echo "Installation des dépendances..."
npm install

echo "Vérification TypeScript..."
npm run typecheck || true

echo
echo "============================================"
echo "RevisionOS est prêt."
echo "Dossier : $APP_DIR"
echo "Adresse : http://localhost:3000"
echo "============================================"
echo

if command -v xdg-open >/dev/null 2>&1; then
  (sleep 4 && xdg-open "http://localhost:3000" >/dev/null 2>&1) &
fi

npm run dev
