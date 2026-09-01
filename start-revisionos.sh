#!/usr/bin/env bash
set -e

APP_DIR="$HOME/Downloads/RevisionOS_V1"
REPO_URL="https://github.com/alibcasa/projet001.git"
BRANCH="revisionos-v1"

echo "=== RevisionOS V1 - GitHub install & start ==="

if ! command -v git >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y git
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR: Node.js n'est pas installé."
  echo "Installe Node.js 22 puis relance."
  exit 1
fi

echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

rm -rf "$APP_DIR"
echo "Clonage depuis GitHub..."
git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "ERREUR: package.json absent dans le dépôt GitHub."
  pwd
  ls -la
  exit 1
fi

echo "package.json trouvé: $APP_DIR/package.json"

if [ ! -f .env.local ] && [ -f .env.example ]; then
  cp .env.example .env.local
  echo ".env.local créé depuis .env.example"
fi

echo "Installation des dépendances..."
npm install

echo "Vérification TypeScript..."
npm run typecheck || true

echo "Démarrage RevisionOS sur http://localhost:3000"
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 5 && xdg-open "http://localhost:3000" >/dev/null 2>&1) &
fi
npm run dev
