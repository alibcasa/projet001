#!/usr/bin/env bash
set -euo pipefail
REPO="https://github.com/alibcasa/projet001.git"
BRANCH="revisionos-v1"
APP="$HOME/Downloads/RevisionOS_V1"
echo "=== RevisionOS V1 - Installation GitHub ==="
command -v git >/dev/null || { sudo apt update && sudo apt install -y git; }
command -v node >/dev/null || { echo "Node.js 22 requis"; exit 1; }
echo "Node: $(node -v) | npm: $(npm -v)"
rm -rf "$APP"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP"
cd "$APP"
test -f package.json || { echo "ERREUR: package.json absent dans GitHub"; exit 1; }
[ -f .env.local ] || cp .env.example .env.local
echo "Projet: $APP"
echo "Installation npm..."
npm install
echo "Vérification TypeScript..."
npm run typecheck || true
echo "Démarrage: http://localhost:3000"
npm run dev
