#!/usr/bin/env bash
set -Eeuo pipefail

REPO="https://github.com/alibcasa/projet001.git"
BRANCH="revisionos-v1"
APP="${REVISIONOS_DIR:-$HOME/Downloads/RevisionOS_V1}"
PORT="${PORT:-3000}"
ADMIN_EMAIL="${REVISIONOS_ADMIN_EMAIL:-admin@revisionos.local}"
ADMIN_PASSWORD="${REVISIONOS_ADMIN_PASSWORD:-RevisionOS-Admin-2026!}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:4b}"
OPENPROJECT_PORT="${OPENPROJECT_PORT:-8081}"
OPENPROJECT_ADMIN_PASSWORD="${OPENPROJECT_ADMIN_PASSWORD:-RevisionOS-OpenProject-2026!}"
OPENPROJECT_CONTAINER="revisionos-openproject"

green='\033[0;32m'; yellow='\033[1;33m'; red='\033[0;31m'; reset='\033[0m'
info(){ printf "${green}[OK]${reset} %s\n" "$*"; }
warn(){ printf "${yellow}[INFO]${reset} %s\n" "$*"; }
fail(){ printf "${red}[ERREUR]${reset} %s\n" "$*" >&2; exit 1; }
trap 'printf "\n${red}[ERREUR]${reset} Installation interrompue à la ligne %s.\n" "$LINENO" >&2' ERR

echo "===================================================="
echo " RevisionOS V1 - Installation automatique complète"
echo "===================================================="

if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then sudo apt update; sudo apt install -y git curl ca-certificates; fi
need_node=0
if ! command -v node >/dev/null 2>&1; then need_node=1; else major="$(node -p "process.versions.node.split('.')[0]")"; [ "$major" -ge 22 ] || need_node=1; fi
if [ "$need_node" -eq 1 ]; then warn "Installation de Node.js 22..."; curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -; sudo apt install -y nodejs; fi
info "Node.js $(node -v)"; info "npm $(npm -v)"

if [ -d "$APP/.git" ]; then
  warn "Synchronisation stricte avec GitHub..."
  git -C "$APP" remote set-url origin "$REPO"
  git -C "$APP" fetch --prune origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
  git -C "$APP" checkout -B "$BRANCH" "origin/$BRANCH"
  git -C "$APP" reset --hard "origin/$BRANCH"
  git -C "$APP" clean -fd -e .env.local -e .revisionos-admin -e .openproject-secret -e .openproject-token -e supabase
else
  rm -rf "$APP"; mkdir -p "$(dirname "$APP")"; git clone --branch "$BRANCH" --single-branch "$REPO" "$APP"
fi
cd "$APP"
local_sha="$(git rev-parse HEAD)"; remote_sha="$(git rev-parse origin/$BRANCH)"
[ "$local_sha" = "$remote_sha" ] || fail "La copie locale n'est pas au dernier commit GitHub."
info "Commit GitHub installé: ${local_sha:0:12}"
[ -f package.json ] || fail "package.json absent après clonage GitHub."

[ -f .env.local ] || cp .env.example .env.local
set_env(){ local key="$1" value="$2"; if grep -q "^${key}=" .env.local; then sed -i "s|^${key}=.*|${key}=${value}|" .env.local; else printf '%s=%s\n' "$key" "$value" >> .env.local; fi; }
get_env(){ grep -m1 "^$1=" .env.local 2>/dev/null | cut -d= -f2- || true; }
set_env AI_PROVIDER ollama
set_env OLLAMA_BASE_URL "${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
set_env OLLAMA_MODEL "$OLLAMA_MODEL"
set_env NEXT_PUBLIC_APP_URL "http://localhost:$PORT"
set_env GOOGLE_REDIRECT_URI "http://localhost:$PORT/api/integrations/google/callback"
set_env MICROSOFT_REDIRECT_URI "http://localhost:$PORT/api/integrations/microsoft/callback"
set_env OPENPROJECT_URL "http://localhost:$OPENPROJECT_PORT"

warn "Installation des dépendances npm..."; npm install --no-audit --no-fund; info "Dépendances npm installées"
if ! command -v docker >/dev/null 2>&1; then warn "Installation de Docker..."; sudo apt update; sudo apt install -y docker.io; fi
sudo systemctl enable --now docker; sudo docker info >/dev/null 2>&1 || fail "Docker ne répond pas après installation."; info "Docker prêt"

run_supabase(){ (cd "$APP" && sudo env "PATH=$PATH" npx --yes supabase@latest "$@"); [ ! -d "$APP/supabase" ] || sudo chown -R "$USER":"$(id -gn "$USER")" "$APP/supabase" || true; }
refresh_supabase_env(){
  local status_env local_api local_anon local_service local_db
  status_env="$(run_supabase status -o env)"
  read_status(){ printf '%s\n' "$status_env" | awk -F= -v k="$1" '$1==k{v=substr($0,index($0,"=")+1); gsub(/^\"|\"$/,"",v); print v; exit}'; }
  local_api="$(read_status API_URL)"; local_anon="$(read_status ANON_KEY)"; [ -n "$local_anon" ] || local_anon="$(read_status PUBLISHABLE_KEY)"
  local_service="$(read_status SERVICE_ROLE_KEY)"; [ -n "$local_service" ] || local_service="$(read_status SECRET_KEY)"; local_db="$(read_status DB_URL)"
  [ -n "$local_api" ] || fail "API_URL Supabase local introuvable."; [ -n "$local_anon" ] || fail "Clé publique Supabase locale introuvable."; [ -n "$local_service" ] || fail "Clé service Supabase locale introuvable."; [ -n "$local_db" ] || fail "DB_URL Supabase local introuvable."
  set_env NEXT_PUBLIC_SUPABASE_URL "$local_api"; set_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY "$local_anon"; set_env SUPABASE_SERVICE_ROLE_KEY "$local_service"; SUPABASE_DB_URL="$local_db"
}
supabase_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"; supabase_key="$(get_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"; SUPABASE_DB_URL="${SUPABASE_DB_URL:-}"
if [[ "$supabase_url" == http://127.0.0.1:* || "$supabase_url" == http://localhost:* || -z "$supabase_url" || -z "$supabase_key" ]]; then
  warn "Démarrage/configuration de Supabase local..."; [ -f supabase/config.toml ] || run_supabase init; run_supabase start; refresh_supabase_env; info "Supabase local prêt: $(get_env NEXT_PUBLIC_SUPABASE_URL)"
else info "Configuration Supabase cloud existante détectée"; fi
if ! command -v psql >/dev/null 2>&1; then sudo apt update; sudo apt install -y postgresql-client; fi
if [ -n "$SUPABASE_DB_URL" ]; then
  warn "Préparation de la base RevisionOS..."
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "create table if not exists public.revisionos_migrations(name text primary key, applied_at timestamptz not null default now());" >/dev/null
  if [ "$(psql "$SUPABASE_DB_URL" -Atc "select case when to_regclass('public.documents') is not null and to_regclass('public.keynotes') is not null and to_regclass('public.quizzes') is not null then 1 else 0 end")" = 1 ]; then psql "$SUPABASE_DB_URL" -c "insert into public.revisionos_migrations(name) values('001_init') on conflict do nothing" >/dev/null; fi
  apply_sql(){ local id="$1" file="$2" done; done="$(psql "$SUPABASE_DB_URL" -Atc "select count(*) from public.revisionos_migrations where name='$id'")"; if [ "$done" = 0 ]; then warn "Migration $id..."; psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$file"; psql "$SUPABASE_DB_URL" -c "insert into public.revisionos_migrations(name) values('$id') on conflict do nothing" >/dev/null; fi; }
  apply_sql 001_init database/migrations/001_init.sql; apply_sql 002_complete_app database/migrations/002_complete_app.sql; apply_sql 003_security database/migrations/003_security.sql; [ ! -f database/migrations/004_local_features.sql ] || apply_sql 004_local_features database/migrations/004_local_features.sql
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/seed/001_categories.sql >/dev/null; info "Base de données et Storage PDF prêts"
else warn "Supabase cloud détecté sans SUPABASE_DB_URL : migrations cloud non appliquées automatiquement."; fi

if [ -n "$SUPABASE_DB_URL" ]; then
  service_key="$(get_env SUPABASE_SERVICE_ROLE_KEY)"; api_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
  admin_id="$(psql "$SUPABASE_DB_URL" -At -v email="$ADMIN_EMAIL" <<'SQL'
select id from auth.users where email = :'email' limit 1;
SQL
)"
  if [ -z "$admin_id" ]; then
    warn "Création du compte super-admin RevisionOS..."
    curl -fsS -X POST "$api_url/auth/v1/admin/users" -H "apikey: $service_key" -H "Authorization: Bearer $service_key" -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"RevisionOS Admin\"}}" >/dev/null; sleep 1
  else curl -fsS -X PUT "$api_url/auth/v1/admin/users/$admin_id" -H "apikey: $service_key" -H "Authorization: Bearer $service_key" -H "Content-Type: application/json" -d "{\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true}" >/dev/null; fi
  psql "$SUPABASE_DB_URL" -v email="$ADMIN_EMAIL" >/dev/null <<'SQL'
update public.profiles set role='super_admin' where email = :'email';
SQL
  printf 'EMAIL=%s\nPASSWORD=%s\n' "$ADMIN_EMAIL" "$ADMIN_PASSWORD" > .revisionos-admin; chmod 600 .revisionos-admin; info "Super-admin RevisionOS prêt"
fi

if [ "${INSTALL_OLLAMA:-1}" = 1 ]; then
  if ! command -v ollama >/dev/null 2>&1; then warn "Installation d'Ollama..."; curl -fsSL https://ollama.com/install.sh | sh; fi
  sudo systemctl enable --now ollama >/dev/null 2>&1 || true
  if ! pgrep -x ollama >/dev/null 2>&1; then nohup ollama serve > "$APP/ollama.log" 2>&1 & sleep 3; fi
  if ! ollama list 2>/dev/null | awk 'NR>1{print $1}' | grep -qx "$OLLAMA_MODEL"; then warn "Téléchargement du modèle IA $OLLAMA_MODEL..."; ollama pull "$OLLAMA_MODEL"; fi
  curl -fsS http://127.0.0.1:11434/api/tags >/dev/null || fail "Ollama ne répond pas."; info "Ollama prêt avec $OLLAMA_MODEL"
fi

if [ "${INSTALL_OPENPROJECT:-1}" = 1 ]; then
  warn "Configuration d'OpenProject Community local..."
  if [ ! -s .openproject-secret ]; then openssl rand -hex 64 > .openproject-secret; chmod 600 .openproject-secret; fi
  op_secret="$(cat .openproject-secret)"; sudo docker volume create revisionos-openproject-pgdata >/dev/null; sudo docker volume create revisionos-openproject-assets >/dev/null

  if sudo docker inspect "$OPENPROJECT_CONTAINER" >/dev/null 2>&1; then
    state="$(sudo docker inspect -f '{{.State.Status}}' "$OPENPROJECT_CONTAINER" 2>/dev/null || true)"
    if [ "$state" != running ]; then
      warn "Conteneur OpenProject existant détecté ($state), démarrage..."
      sudo docker start "$OPENPROJECT_CONTAINER" >/dev/null
    else
      info "Conteneur OpenProject existant réutilisé"
    fi
  else
    warn "Création initiale du conteneur OpenProject..."
    sudo docker run -d -t --name "$OPENPROJECT_CONTAINER" --restart unless-stopped \
      -p "127.0.0.1:${OPENPROJECT_PORT}:80" \
      -v revisionos-openproject-pgdata:/var/openproject/pgdata \
      -v revisionos-openproject-assets:/var/openproject/assets \
      -e "SECRET_KEY_BASE=$op_secret" \
      -e "OPENPROJECT_HOST__NAME=localhost:${OPENPROJECT_PORT}" \
      -e "OPENPROJECT_HTTPS=false" \
      -e "OPENPROJECT_DEFAULT__LANGUAGE=fr" \
      openproject/openproject:17 >/dev/null
  fi

  warn "Vérification d'OpenProject..."
  op_ready=0
  for i in $(seq 1 120); do
    state="$(sudo docker inspect -f '{{.State.Status}}' "$OPENPROJECT_CONTAINER" 2>/dev/null || true)"
    if [ "$state" = exited ] || [ "$state" = dead ]; then sudo docker logs --tail 120 "$OPENPROJECT_CONTAINER" >&2 || true; fail "Le conteneur OpenProject s'est arrêté pendant le démarrage."; fi
    http_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Host: localhost:${OPENPROJECT_PORT}" "http://127.0.0.1:${OPENPROJECT_PORT}/login" 2>/dev/null || true)"
    case "$http_code" in 200|301|302|303) op_ready=1; break;; esac
    if [ $((i % 12)) -eq 0 ]; then warn "OpenProject démarre encore... $((i*5)) secondes (HTTP ${http_code:-000})"; fi
    sleep 5
  done
  if [ "$op_ready" != 1 ]; then sudo docker logs --tail 120 "$OPENPROJECT_CONTAINER" >&2 || true; fail "OpenProject n'a pas répondu correctement après 10 minutes."; fi
  info "OpenProject HTTP prêt"

  sudo docker exec -e "REVISIONOS_OP_PASSWORD=$OPENPROJECT_ADMIN_PASSWORD" "$OPENPROJECT_CONTAINER" bash -lc "RAILS_ENV=production bundle exec rails runner 'u=User.find_by(login: \"admin\"); p=ENV.fetch(\"REVISIONOS_OP_PASSWORD\"); u.password=p; u.password_confirmation=p; u.force_password_change=false; u.save!'" >/dev/null
  if [ ! -s .openproject-token ]; then
    op_token="$(sudo docker exec "$OPENPROJECT_CONTAINER" bash -lc "RAILS_ENV=production bundle exec rails runner 'u=User.find_by(login: \"admin\"); puts Token::API.create_and_return_value(u)'" | grep -o 'opapi-[A-Za-z0-9_-]*' | tail -n1)"
    [ -n "$op_token" ] || fail "Impossible de générer le jeton API OpenProject."; printf '%s\n' "$op_token" > .openproject-token; chmod 600 .openproject-token
  fi
  set_env OPENPROJECT_URL "http://localhost:$OPENPROJECT_PORT"; set_env OPENPROJECT_API_TOKEN "$(cat .openproject-token)"; info "OpenProject prêt sur http://localhost:$OPENPROJECT_PORT"
fi

warn "Vérification TypeScript..."; npm run typecheck; info "TypeScript OK"
warn "Build Next.js..."; npm run build; info "Build Next.js OK"
supabase_url="$(get_env NEXT_PUBLIC_SUPABASE_URL)"; supabase_key="$(get_env NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"; [ -n "$supabase_url" ] && [ -n "$supabase_key" ] || fail "Supabase n'est pas configuré. Démarrage annulé."
printf '\n====================================================\n RevisionOS prêt\n Commit   : %s\n Dossier  : %s\n Site     : http://localhost:%s\n Admin RevisionOS : %s\n MP RevisionOS    : %s\n OpenProject      : http://localhost:%s\n Admin OpenProject: admin\n MP OpenProject   : %s\n Ollama           : %s\n====================================================\n\n' "$local_sha" "$APP" "$PORT" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$OPENPROJECT_PORT" "$OPENPROJECT_ADMIN_PASSWORD" "$OLLAMA_MODEL"
if command -v xdg-open >/dev/null 2>&1 && [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then (sleep 5; xdg-open "http://localhost:$PORT/login" >/dev/null 2>&1 || true) & fi
exec npm run dev -- --hostname 0.0.0.0 --port "$PORT"
