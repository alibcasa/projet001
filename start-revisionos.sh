#!/usr/bin/env bash
set -Eeuo pipefail

REPO="https://github.com/alibcasa/projet001.git"
BRANCH="revisionos-v1"
APP="${REVISIONOS_DIR:-$HOME/Downloads/RevisionOS_V1}"
PORT="${PORT:-3000}"
ADMIN_EMAIL="${REVISIONOS_ADMIN_EMAIL:-admin@revisionos.local}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:4b}"

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
  git -C "$APP" clean -fd -e .env.local -e .revisionos-admin -e supabase
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
  if grep -q "^${key}=" .env.local; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env.local
  else
    printf '%s=%s\n' "$key" "$value" >> .env.local
  fi
}
get_env(){ grep -m1 "^$1=" .env.local 2>/dev/null | cut -d= -f2- || true; }

set_env AI_PROVIDER "${AI_PROVIDER:-ollama}"
set_env OLLAMA_BASE_URL "${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
set_env OLLAMA_MODEL "$OLLAMA_MODEL"
set_env NEXT_PUBLIC_APP_URL "http://localhost:$PORT"
set_env GOOGLE_REDIRECT_URI "http://localhost:$PORT/api/integrations/google/callback"
set_env MICROSOFT_REDIRECT_URI "http://localhost:$PORT/api/integrations/microsoft/callback"

warn "Installation des dépendances npm..."
npm install --no-audit --no-fund
info "Dépendances npm installées"

if ! command -v docker >/dev/null 2>&1; then
  warn "Installation de Docker..."
  sudo apt update
  sudo apt install -y docker.io
fi
sudo systemctl enable --now docker
sudo docker info >/dev/null 2>&1 || fail "Docker ne répond pas après installation."
info "Docker prêt"

run_supabase(){
  local args="$*"
  sudo -E env "PATH=$PATH" bash -lc "cd '$APP' && npx --yes supabase@latest $args"
  if [ -d "$APP/supabase" ]; then
    sudo chown -R "$USER":"$(id -gn "$USER")" "$APP/supabase" || true
  fi
}

supabase_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
supabase_key="$(get_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
SUPABASE_DB_URL="${SUPABASE_DB_URL:-}"

# Une URL locale sauvegardée doit être réutilisée avec une DB_URL fraîche.
if [[ "$supabase_url" == http://127.0.0.1:* || "$supabase_url" == http://localhost:* ]]; then
  warn "Réutilisation de Supabase local..."
  if [ ! -f supabase/config.toml ]; then
    run_supabase init
  fi
  run_supabase start
  status_env="$(run_supabase status -o env)"
  read_status(){ printf '%s\n' "$status_env" | awk -F= -v k="$1" '$1==k{v=substr($0,index($0,"=")+1); gsub(/^\"|\"$/,"",v); print v; exit}'; }
  local_api="$(read_status API_URL)"
  local_anon="$(read_status ANON_KEY)"
  local_service="$(read_status SERVICE_ROLE_KEY)"
  local_db="$(read_status DB_URL)"
  [ -n "$local_api" ] || fail "API_URL Supabase local introuvable."
  [ -n "$local_anon" ] || fail "ANON_KEY Supabase local introuvable."
  [ -n "$local_service" ] || fail "SERVICE_ROLE_KEY Supabase local introuvable."
  [ -n "$local_db" ] || fail "DB_URL Supabase local introuvable."
  set_env NEXT_PUBLIC_SUPABASE_URL "$local_api"
  set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$local_anon"
  set_env SUPABASE_SERVICE_ROLE_KEY "$local_service"
  SUPABASE_DB_URL="$local_db"
elif [ -z "$supabase_url" ] || [ -z "$supabase_key" ]; then
  warn "Configuration Supabase locale automatique..."
  if [ ! -f supabase/config.toml ]; then
    run_supabase init
  fi
  warn "Démarrage de Supabase local (premier lancement : téléchargement des images Docker)..."
  run_supabase start
  status_env="$(run_supabase status -o env)"
  read_status(){ printf '%s\n' "$status_env" | awk -F= -v k="$1" '$1==k{v=substr($0,index($0,"=")+1); gsub(/^\"|\"$/,"",v); print v; exit}'; }
  local_api="$(read_status API_URL)"
  local_anon="$(read_status ANON_KEY)"
  local_service="$(read_status SERVICE_ROLE_KEY)"
  local_db="$(read_status DB_URL)"
  [ -n "$local_api" ] || fail "API_URL Supabase local introuvable."
  [ -n "$local_anon" ] || fail "ANON_KEY Supabase local introuvable."
  [ -n "$local_service" ] || fail "SERVICE_ROLE_KEY Supabase local introuvable."
  [ -n "$local_db" ] || fail "DB_URL Supabase local introuvable."
  set_env NEXT_PUBLIC_SUPABASE_URL "$local_api"
  set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$local_anon"
  set_env SUPABASE_SERVICE_ROLE_KEY "$local_service"
  SUPABASE_DB_URL="$local_db"
  info "Supabase local prêt: $local_api"
else
  info "Configuration Supabase cloud existante détectée"
fi

if ! command -v psql >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y postgresql-client
fi

if [ -n "$SUPABASE_DB_URL" ]; then
  warn "Préparation de la base RevisionOS..."
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "create table if not exists public.revisionos_migrations(name text primary key, applied_at timestamptz not null default now());" >/dev/null

  if [ "$(psql "$SUPABASE_DB_URL" -Atc "select case when to_regclass('public.documents') is not null and to_regclass('public.keynotes') is not null and to_regclass('public.quizzes') is not null then 1 else 0 end")" = "1" ]; then
    psql "$SUPABASE_DB_URL" -c "insert into public.revisionos_migrations(name) values('001_init') on conflict do nothing" >/dev/null
  fi

  apply_sql(){
    local id="$1" file="$2"
    local done
    done="$(psql "$SUPABASE_DB_URL" -Atc "select count(*) from public.revisionos_migrations where name='$id'")"
    if [ "$done" = "0" ]; then
      warn "Migration $id..."
      psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$file"
      psql "$SUPABASE_DB_URL" -c "insert into public.revisionos_migrations(name) values('$id') on conflict do nothing" >/dev/null
    fi
  }

  apply_sql 001_init database/migrations/001_init.sql
  apply_sql 002_complete_app database/migrations/002_complete_app.sql
  apply_sql 003_security database/migrations/003_security.sql
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/seed/001_categories.sql >/dev/null
  info "Base de données et Storage PDF prêts"
else
  warn "Supabase cloud détecté sans SUPABASE_DB_URL : migrations cloud non appliquées automatiquement."
fi

# Compte super-admin local. Les variables psql sont injectées via stdin, pas via -c.
if [ -n "$SUPABASE_DB_URL" ]; then
  service_key="$(get_env SUPABASE_SERVICE_ROLE_KEY)"
  api_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
  admin_id="$(psql "$SUPABASE_DB_URL" -At -v email="$ADMIN_EMAIL" <<'SQL'
select id from auth.users where email = :'email' limit 1;
SQL
)"

  if [ -z "$admin_id" ]; then
    if command -v openssl >/dev/null 2>&1; then
      ADMIN_PASSWORD="${REVISIONOS_ADMIN_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9@#%+=' | head -c 20)}"
    else
      ADMIN_PASSWORD="${REVISIONOS_ADMIN_PASSWORD:-RevisionOS-Local-2026!}"
    fi
    warn "Création du compte super-admin local..."
    curl -fsS -X POST "$api_url/auth/v1/admin/users" \
      -H "apikey: $service_key" \
      -H "Authorization: Bearer $service_key" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"RevisionOS Admin\"}}" >/dev/null
    sleep 1
    psql "$SUPABASE_DB_URL" -v email="$ADMIN_EMAIL" >/dev/null <<'SQL'
update public.profiles set role='super_admin' where email = :'email';
SQL
    printf 'EMAIL=%s\nPASSWORD=%s\n' "$ADMIN_EMAIL" "$ADMIN_PASSWORD" > .revisionos-admin
    chmod 600 .revisionos-admin
    info "Compte super-admin créé"
  else
    psql "$SUPABASE_DB_URL" -v email="$ADMIN_EMAIL" >/dev/null <<'SQL'
update public.profiles set role='super_admin' where email = :'email';
SQL
    info "Compte super-admin local déjà présent"
  fi
fi

if [ "${INSTALL_OLLAMA:-1}" = "1" ]; then
  if ! command -v ollama >/dev/null 2>&1; then
    warn "Installation d'Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
  fi
  sudo systemctl enable --now ollama >/dev/null 2>&1 || true
  if ! pgrep -x ollama >/dev/null 2>&1; then
    nohup ollama serve > "$APP/ollama.log" 2>&1 &
    sleep 3
  fi
  if ! ollama list 2>/dev/null | awk 'NR>1{print $1}' | grep -qx "$OLLAMA_MODEL"; then
    warn "Téléchargement du modèle IA $OLLAMA_MODEL..."
    ollama pull "$OLLAMA_MODEL"
  fi
  info "Ollama prêt avec $OLLAMA_MODEL"
fi

warn "Vérification TypeScript..."
npm run typecheck
info "TypeScript OK"
warn "Build Next.js..."
npm run build
info "Build Next.js OK"

supabase_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
supabase_key="$(get_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
[ -n "$supabase_url" ] && [ -n "$supabase_key" ] || fail "Supabase n'est pas configuré. Démarrage annulé."

printf '\n====================================================\n'
printf ' RevisionOS prêt\n'
printf ' Commit   : %s\n' "$local_sha"
printf ' Dossier  : %s\n' "$APP"
printf ' Supabase : %s\n' "$supabase_url"
printf ' Site     : http://localhost:%s\n' "$PORT"
if [ -f .revisionos-admin ]; then
  printf ' Admin    : %s\n' "$(grep '^EMAIL=' .revisionos-admin | cut -d= -f2-)"
  printf ' Mot passe: %s\n' "$(grep '^PASSWORD=' .revisionos-admin | cut -d= -f2-)"
fi
printf '====================================================\n\n'

if command -v xdg-open >/dev/null 2>&1 && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  (sleep 5; xdg-open "http://localhost:$PORT/login" >/dev/null 2>&1 || true) &
fi
exec npm run dev -- --hostname 0.0.0.0 --port "$PORT"
