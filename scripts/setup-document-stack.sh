#!/usr/bin/env bash
set -Eeuo pipefail

APP="${REVISIONOS_DIR:-$HOME/Downloads/RevisionOS_V1}"
PAPERLESS_PORT="${PAPERLESS_PORT:-8010}"
PAPERLESS_ADMIN_USER="${PAPERLESS_ADMIN_USER:-admin}"
PAPERLESS_ADMIN_MAIL="${PAPERLESS_ADMIN_MAIL:-admin@revisionos.local}"
PAPERLESS_ADMIN_PASSWORD="${PAPERLESS_ADMIN_PASSWORD:-RevisionOS-Paperless-2026!}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:4b}"

green='\033[0;32m'; yellow='\033[1;33m'; red='\033[0;31m'; reset='\033[0m'
info(){ printf "${green}[OK]${reset} %s\n" "$*"; }
warn(){ printf "${yellow}[INFO]${reset} %s\n" "$*"; }
fail(){ printf "${red}[ERREUR]${reset} %s\n" "$*" >&2; exit 1; }
trap 'printf "\n${red}[ERREUR]${reset} Stack documentaire interrompue à la ligne %s.\n" "$LINENO" >&2' ERR

[ -d "$APP/.git" ] || fail "RevisionOS absent dans $APP. Lancez d'abord l'installateur RevisionOS."
cd "$APP"
[ -f .env.local ] || cp .env.example .env.local
set_env(){ local key="$1" value="$2"; if grep -q "^${key}=" .env.local; then sed -i "s|^${key}=.*|${key}=${value}|" .env.local; else printf '%s=%s\n' "$key" "$value" >> .env.local; fi; }

if ! command -v docker >/dev/null 2>&1; then sudo apt update; sudo apt install -y docker.io; fi
sudo systemctl enable --now docker >/dev/null
if sudo docker compose version >/dev/null 2>&1; then
  compose=(sudo docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose=(sudo docker-compose)
else
  warn "Installation de Docker Compose..."
  sudo apt update
  sudo apt install -y docker-compose-v2 2>/dev/null || sudo apt install -y docker-compose
  if sudo docker compose version >/dev/null 2>&1; then compose=(sudo docker compose); else compose=(sudo docker-compose); fi
fi

mkdir -p docker/paperless/consume
if [ ! -s .paperless-secret ]; then openssl rand -hex 64 > .paperless-secret; chmod 600 .paperless-secret; fi
if [ ! -s .paperless-db-password ]; then openssl rand -hex 32 > .paperless-db-password; chmod 600 .paperless-db-password; fi

cat > .paperless-stack.env <<EOF
PAPERLESS_PORT=$PAPERLESS_PORT
PAPERLESS_DB_PASSWORD=$(cat .paperless-db-password)
PAPERLESS_SECRET_KEY=$(cat .paperless-secret)
PAPERLESS_ADMIN_USER=$PAPERLESS_ADMIN_USER
PAPERLESS_ADMIN_MAIL=$PAPERLESS_ADMIN_MAIL
PAPERLESS_ADMIN_PASSWORD=$PAPERLESS_ADMIN_PASSWORD
OLLAMA_MODEL=$OLLAMA_MODEL
USERMAP_UID=$(id -u)
USERMAP_GID=$(id -g)
EOF
chmod 600 .paperless-stack.env

warn "Démarrage de Paperless-ngx (OCR arabe/français/anglais + Ollama)..."
"${compose[@]}" --env-file .paperless-stack.env -f docker/paperless/docker-compose.yml pull
"${compose[@]}" --env-file .paperless-stack.env -f docker/paperless/docker-compose.yml up -d

paperless_url="http://127.0.0.1:$PAPERLESS_PORT"
ready=0
for i in $(seq 1 120); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$paperless_url/accounts/login/" 2>/dev/null || true)"
  case "$code" in 200|301|302|303) ready=1; break;; esac
  if [ $((i % 12)) -eq 0 ]; then warn "Paperless-ngx démarre encore... $((i*5)) secondes (HTTP ${code:-000})"; fi
  sleep 5
done
if [ "$ready" != 1 ]; then
  "${compose[@]}" --env-file .paperless-stack.env -f docker/paperless/docker-compose.yml logs --tail 120 webserver >&2 || true
  fail "Paperless-ngx n'a pas répondu après 10 minutes."
fi

# Garantit un mot de passe local déterministe sans supprimer les documents ou volumes.
"${compose[@]}" --env-file .paperless-stack.env -f docker/paperless/docker-compose.yml exec -T -e REVISIONOS_PAPERLESS_PASSWORD="$PAPERLESS_ADMIN_PASSWORD" webserver \
  python manage.py shell -c "import os; from django.contrib.auth import get_user_model; U=get_user_model(); u=U.objects.filter(username='$PAPERLESS_ADMIN_USER').first(); u.set_password(os.environ['REVISIONOS_PAPERLESS_PASSWORD']); u.save() if u else None" >/dev/null 2>&1 || true

token_json="$(curl -fsS -X POST "$paperless_url/api/token/" -H 'Content-Type: application/json' --data "{\"username\":\"$PAPERLESS_ADMIN_USER\",\"password\":\"$PAPERLESS_ADMIN_PASSWORD\"}")"
paperless_token="$(TOKEN_JSON="$token_json" node -e "const x=JSON.parse(process.env.TOKEN_JSON||'{}');process.stdout.write(x.token||'')")"
[ -n "$paperless_token" ] || fail "Jeton API Paperless introuvable."
set_env PAPERLESS_URL "http://127.0.0.1:$PAPERLESS_PORT"
set_env PAPERLESS_API_TOKEN "$paperless_token"
printf 'URL=http://localhost:%s\nUSER=%s\nPASSWORD=%s\n' "$PAPERLESS_PORT" "$PAPERLESS_ADMIN_USER" "$PAPERLESS_ADMIN_PASSWORD" > .paperless-admin
chmod 600 .paperless-admin
info "Paperless-ngx prêt sur http://localhost:$PAPERLESS_PORT"

set_env JOPLIN_BASE_URL "http://127.0.0.1:41184"
if [ "${INSTALL_JOPLIN:-1}" = 1 ]; then
  if [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
    if [ ! -x "$HOME/.joplin/Joplin.AppImage" ] && ! command -v joplin-desktop >/dev/null 2>&1; then
      warn "Préparation de Joplin Desktop..."
      if ! command -v wget >/dev/null 2>&1; then sudo apt update; sudo apt install -y wget; fi
      # Joplin est distribué en AppImage et requiert FUSE 2 sur Ubuntu.
      if ! ldconfig -p 2>/dev/null | grep -q 'libfuse.so.2'; then
        warn "Installation de la compatibilité FUSE requise par Joplin..."
        sudo apt update
        if apt-cache show libfuse2t64 >/dev/null 2>&1; then
          sudo apt install -y libfuse2t64
        elif apt-cache show libfuse2 >/dev/null 2>&1; then
          sudo apt install -y libfuse2
        else
          sudo apt install -y fuse libfuse2
        fi
      fi
      warn "Installation de Joplin Desktop..."
      if ! wget -qO- https://raw.githubusercontent.com/laurent22/joplin/dev/Joplin_install_and_update.sh | bash; then
        fail "Installation de Joplin impossible après installation de FUSE."
      fi
    fi
    info "Joplin Desktop installé. RevisionOS demandera l'autorisation API depuis l'écran Notes."
  else
    warn "Session graphique absente: installation Joplin Desktop ignorée sur cette machine. Le connecteur RevisionOS reste disponible."
  fi
fi

info "Stack documentaire prête: RevisionOS + Paperless-ngx + Ollama + Joplin"
echo "Paperless : http://localhost:$PAPERLESS_PORT"
echo "Joplin : ouvrir l'application puis activer Outils > Options > Web Clipper"
