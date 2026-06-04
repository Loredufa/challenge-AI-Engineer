#!/usr/bin/env bash
# DocuMind AI — startup script (Linux / macOS)
# Usage: ./start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step()    { echo -e "\n\033[36m==> $*\033[0m"; }
ok()      { echo -e "  \033[32m[OK]\033[0m $*"; }
fail()    { echo -e "  \033[31m[FAIL]\033[0m $*"; exit 1; }

# ── 1. Docker running? ────────────────────────────────────────────────────────
step "Checking Docker..."
docker info > /dev/null 2>&1 || fail "Docker is not running. Start Docker and retry."
ok "Docker is running"

# ── 2. .env file ──────────────────────────────────────────────────────────────
step "Checking .env..."
if [[ ! -f "$ROOT/.env" ]]; then
    if [[ -f "$ROOT/jwt-keys.txt" ]]; then
        cp "$ROOT/jwt-keys.txt" "$ROOT/.env"
        ok ".env created from jwt-keys.txt"
    else
        fail ".env missing and jwt-keys.txt not found. Create .env with JWT_PRIVATE_KEY and JWT_PUBLIC_KEY."
    fi
else
    ok ".env already exists"
fi

# ── 3. Build & start all services ─────────────────────────────────────────────
step "Building and starting services (postgres, redis, backend, worker, frontend)..."
cd "$ROOT"
docker-compose up --build -d
ok "All containers started"

# ── 4. Wait for PostgreSQL ─────────────────────────────────────────────────────
step "Waiting for PostgreSQL..."
retries=30
until docker-compose exec -T postgres pg_isready -U dev -d documind > /dev/null 2>&1; do
    retries=$((retries - 1))
    [[ $retries -le 0 ]] && fail "PostgreSQL did not become ready after 60 s"
    sleep 2
done
ok "PostgreSQL is ready"

# ── 5. Run migrations ──────────────────────────────────────────────────────────
step "Running database migrations..."
docker-compose run --rm backend node dist/infrastructure/database/migrate.js \
    || fail "Migrations failed — check logs with: docker-compose logs backend"
ok "Migrations complete"

# ── 6. Summary ────────────────────────────────────────────────────────────────
step "DocuMind AI is up!"
docker-compose ps

echo ""
echo "  Frontend  : http://localhost:3000"
echo "  API       : http://localhost:8080"
echo "  Postgres  : localhost:5433  (user: dev  pass: dev  db: documind)"
echo "  Redis     : localhost:6379"
echo ""
echo "  Stop all  : docker-compose down"
echo "  All logs  : docker-compose logs -f"
echo "  One svc   : docker-compose logs -f worker"
