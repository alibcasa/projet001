#!/usr/bin/env bash
set -e

DOWNLOADS="${HOME}/Downloads"
ZIP="${DOWNLOADS}/RevisionOS_V1.zip"
APP_DIR="${DOWNLOADS}/RevisionOS_V1"

echo "=== RevisionOS V1 - Installation & démarrage ==="

if [ ! -f "$ZIP" ]; then
  echo "ERREUR: fichier introuvable: $ZIP"
  echo "Place RevisionOS_V1.zip dans ~/Downloads puis relance ce script."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR: Node.js n'est pas installé."
  echo "Installe Node.js 20.9+ puis relance."
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

echo "Extraction du projet..."
mkdir -p "$APP_DIR"

TMP_DIR=$(mktemp -d)
unzip -q "$ZIP" -d "$TMP_DIR"

if [ -d "$TMP_DIR/RevisionOS_V1" ]; then
  cp -a "$TMP_DIR/RevisionOS_V1/." "$APP_DIR/"
elif [ -d "$TMP_DIR/revision-library" ]; then
  cp -a "$TMP_DIR/revision-library/." "$APP_DIR/"
else
  FIRST_DIR=$(find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
  if [ -n "$FIRST_DIR" ]; then
    cp -a "$FIRST_DIR/." "$APP_DIR/"
  else
    cp -a "$TMP_DIR/." "$APP_DIR/"
  fi
fi

rm -rf "$TMP_DIR"
cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "ERREUR: package.json introuvable après extraction."
  exit 1
fi

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
