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
echo " RevisionOS V1 - Installation automatique complète"
echo "===================================================="

if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y git curl ca-certificates
fi

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

if [ -d "$APP/.git" ]; then
  warn "Synchronisation stricte avec GitHub..."
  git -C "$APP" remote set-url origin "$REPO"
  git -C "$APP" fetch --prune origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
  git -C "$APP" checkout -B "$BRANCH" "origin/$BRANCH"
  git -C "$APP" reset --hard "origin/$BRANCH"
  git -C "$APP" clean -fd -e .env.local -e supabase
else
  rm -rf "$APP"
  mkdir -p "$(dirname "$APP")"
  git clone --branch "$BRANCH" --single-branch "$REPO" "$APP"
fi

cd "$APP"
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse origin/$BRANCH)"
[ "$local_sha" = "$remote_sha" ] || fail "La copie locale n'est pas au dernier commit GitHub."
info "Commit GitHub installé: ${local_sha:0:12}"
[ -f package.json ] || fail "package.json absent après clonage GitHub."

[ -f .env.local ] || cp .env.example .env.local
set_env(){
  local key="$1" value="$2"
  [ -n "$value" ] || return 0
  if grep -q "^${key}=" .env.local; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env.local
  else
    printf '%s=%s\n' "$key" "$value" >> .env.local
  fi
}
get_env(){ grep -m1 "^$1=" .env.local 2>/dev/null | cut -d= -f2- || true; }

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

warn "Installation des dépendances npm..."
npm install --no-audit --no-fund
info "Dépendances npm installées"

supabase_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
supabase_key="$(get_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"

# Si aucune configuration Supabase cloud n'existe, provisionner Supabase local automatiquement.
if [ -z "$supabase_url" ] || [ -z "$supabase_key" ]; then
  warn "Aucune clé Supabase détectée: installation de Supabase local..."
  if ! command -v docker >/dev/null 2>&1; then
    sudo apt update
    sudo apt install -y docker.io
  fi
  sudo systemctl enable --now docker
  if ! getent group docker >/dev/null 2>&1; then sudo groupadd docker; fi
  sudo usermod -aG docker "$USER" || true

  # Exécuter Docker dans le groupe docker sans demander une nouvelle connexion de session.
  run_docker_group(){ sg docker -c "cd '$APP' && $*"; }

  if [ ! -f supabase/config.toml ]; then
    warn "Initialisation Supabase local..."
    run_docker_group "npx --yes supabase@latest init"
  fi

  warn "Démarrage des services Supabase locaux (premier lancement peut être long)..."
  run_docker_group "npx --yes supabase@latest start"

  status_env="$(run_docker_group "npx --yes supabase@latest status -o env")"
  local_api="$(printf '%s\n' "$status_env" | sed -n 's/^API_URL="\(.*\)"$/\1/p' | head -n1)"
  local_anon="$(printf '%s\n' "$status_env" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p' | head -n1)"
  local_service="$(printf '%s\n' "$status_env" | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p' | head -n1)"
  local_db="$(printf '%s\n' "$status_env" | sed -n 's/^DB_URL="\(.*\)"$/\1/p' | head -n1)"

  [ -n "$local_api" ] || fail "Supabase local a démarré mais API_URL n'a pas pu être détectée."
  [ -n "$local_anon" ] || fail "Supabase local a démarré mais ANON_KEY n'a pas pu être détectée."
  [ -n "$local_service" ] || fail "Supabase local a démarré mais SERVICE_ROLE_KEY n'a pas pu être détectée."
  [ -n "$local_db" ] || fail "Supabase local a démarré mais DB_URL n'a pas pu être détectée."

  set_env NEXT_PUBLIC_SUPABASE_URL "$local_api"
  set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$local_anon"
  set_env SUPABASE_SERVICE_ROLE_KEY "$local_service"
  SUPABASE_DB_URL="$local_db"
  info "Supabase local configuré automatiquement: $local_api"
else
  info "Configuration Supabase existante détectée"
fi

if [ -n "${SUPABASE_DB_URL:-}" ]; then
  if ! command -v psql >/dev/null 2>&1; then
    sudo apt update
    sudo apt install -y postgresql-client
  fi
  warn "Application des migrations RevisionOS..."
  for sql in \
    database/migrations/001_init.sql \
    database/migrations/002_complete_app.sql \
    database/migrations/003_security.sql \
    database/seed/001_categories.sql; do
      [ -f "$sql" ] && psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$sql"
  done
  info "Base de données RevisionOS prête"
else
  warn "Base Supabase cloud détectée mais SUPABASE_DB_URL absente: migrations non appliquées automatiquement."
fi

warn "Vérification TypeScript..."
npm run typecheck
info "TypeScript OK"
warn "Build Next.js..."
npm run build
info "Build Next.js OK"

supabase_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
supabase_key="$(get_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
[ -n "$supabase_url" ] && [ -n "$supabase_key" ] || fail "Supabase n'est toujours pas configuré. Démarrage annulé."

printf '\n====================================================\n'
printf ' RevisionOS prêt\n'
printf ' Commit   : %s\n' "$local_sha"
printf ' Dossier  : %s\n' "$APP"
printf ' Supabase : %s\n' "$supabase_url"
printf ' Adresse  : http://localhost:%s\n' "$PORT"
printf '====================================================\n\n'

if command -v xdg-open >/dev/null 2>&1 && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  (sleep 5; xdg-open "http://localhost:$PORT" >/dev/null 2>&1 || true) &
fi
exec npm run dev -- --hostname 0.0.0.0 --port "$PORT"
