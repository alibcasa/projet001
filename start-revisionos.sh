#!/usr/bin/env bash
set -Eeuo pipefail

REPO="https://github.com/alibcasa/projet001.git"
BRANCH="revisionos-v1"
APP="${REVISIONOS_DIR:-$HOME/Downloads/RevisionOS_V1}"
PORT="${PORT:-3000}"

green='\033[0;32m'; yellow='\033[1;33m'; red='\033[0;31m'; reset='\033[0m'
info(){ printf "${green}[OK]${reset} %s\n" "$*"; }
warn(){ printf "${yellow}[INFO]${reset} %s\n" "$*"; }
fail(){ printf "${red}[ERREUR]${reset} %s\n" "$*" >&2; exit 1; }

trap 'printf "\n${red}[ERREUR]${reset} Installation interrompue à la ligne %s.\n" "$LINENO" >&2' ERR

echo "===================================================="
echo " RevisionOS V1 - Installation automatique GitHub"
echo "===================================================="

# 1) Dépendances système
if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y git curl ca-certificates
fi

# 2) Node.js 22 si absent ou trop ancien
need_node=0
if ! command -v node >/dev/null 2>&1; then
  need_node=1
else
  major="$(node -p "process.versions.node.split('.')[0]")"
  [ "$major" -ge 22 ] || need_node=1
fi

if [ "$need_node" -eq 1 ]; then
  warn "Installation de Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
fi

info "Node.js $(node -v)"
info "npm $(npm -v)"

# 3) Télécharger une copie propre du projet
if [ -d "$APP/.git" ]; then
  warn "Mise à jour de la copie existante..."
  git -C "$APP" fetch origin "$BRANCH"
  git -C "$APP" checkout "$BRANCH"
  git -C "$APP" reset --hard "origin/$BRANCH"
  git -C "$APP" clean -fd -e .env.local
else
  rm -rf "$APP"
  mkdir -p "$(dirname "$APP")"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP"
fi

cd "$APP"
[ -f package.json ] || fail "package.json absent après clonage GitHub."
info "package.json trouvé: $APP/package.json"

# 4) Configuration .env.local
if [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

set_env(){
  local key="$1" value="$2"
  [ -n "$value" ] || return 0
  if grep -q "^${key}=" .env.local; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env.local
  else
    printf '%s=%s\n' "$key" "$value" >> .env.local
  fi
}

set_env NEXT_PUBLIC_SUPABASE_URL "${NEXT_PUBLIC_SUPABASE_URL:-}"
set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"
set_env SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY:-}"
set_env AI_PROVIDER "${AI_PROVIDER:-ollama}"
set_env OLLAMA_BASE_URL "${OLLAMA_BASE_URL:-http://localhost:11434}"
set_env OLLAMA_MODEL "${OLLAMA_MODEL:-qwen3:4b}"
set_env OPENROUTER_API_KEY "${OPENROUTER_API_KEY:-}"
set_env OPENAI_API_KEY "${OPENAI_API_KEY:-}"
set_env OPENPROJECT_URL "${OPENPROJECT_URL:-}"
set_env OPENPROJECT_API_TOKEN "${OPENPROJECT_API_TOKEN:-}"
set_env GOOGLE_CLIENT_ID "${GOOGLE_CLIENT_ID:-}"
set_env GOOGLE_CLIENT_SECRET "${GOOGLE_CLIENT_SECRET:-}"
set_env MICROSOFT_CLIENT_ID "${MICROSOFT_CLIENT_ID:-}"
set_env MICROSOFT_CLIENT_SECRET "${MICROSOFT_CLIENT_SECRET:-}"
set_env MICROSOFT_TENANT_ID "${MICROSOFT_TENANT_ID:-common}"
info ".env.local prêt"

# 5) Installation npm
warn "Installation des dépendances npm..."
npm install --no-audit --no-fund
info "Dépendances installées"

# 6) Base Supabase/PostgreSQL facultative mais automatique si URL fournie
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  if ! command -v psql >/dev/null 2>&1; then
    sudo apt update
    sudo apt install -y postgresql-client
  fi
  warn "Application des migrations Supabase/PostgreSQL..."
  for sql in \
    database/migrations/001_init.sql \
    database/migrations/002_complete_app.sql \
    database/migrations/003_security.sql \
    database/seed/001_categories.sql; do
      [ -f "$sql" ] && psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$sql"
  done
  info "Migrations appliquées"
else
  warn "SUPABASE_DB_URL non définie: migrations SQL non exécutées automatiquement."
fi

# 7) Contrôle du code
warn "Vérification TypeScript..."
npm run typecheck
info "TypeScript OK"

warn "Build Next.js..."
npm run build
info "Build Next.js OK"

# 8) Résumé configuration
if grep -q '^NEXT_PUBLIC_SUPABASE_URL=https\?://' .env.local && ! grep -q '^NEXT_PUBLIC_SUPABASE_URL=$' .env.local; then
  info "Supabase configuré dans .env.local"
else
  warn "Supabase n'a pas encore de vraies clés: l'interface démarre, mais auth/DB nécessitent les variables Supabase."
fi

# 9) Démarrage
printf '\n====================================================\n'
printf ' RevisionOS prêt\n'
printf ' Dossier : %s\n' "$APP"
printf ' Adresse : http://localhost:%s\n' "$PORT"
printf '====================================================\n\n'

if command -v xdg-open >/dev/null 2>&1 && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  (sleep 5; xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true) &
fi

exec npm run dev -- --hostname 0.0.0.0 --port "$PORT"
