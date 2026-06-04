#!/usr/bin/env pwsh
# DocuMind AI — startup script (Windows / PowerShell)
# Usage: .\start.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot

function Step($msg)    { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Fail($msg)    { Write-Host "  [FAIL] $msg" -ForegroundColor Red; exit 1 }

# ── 1. Docker running? ────────────────────────────────────────────────────────
Step "Checking Docker..."
try { docker info 2>&1 | Out-Null } catch { Fail "Docker is not running. Start Docker Desktop and retry." }
Ok "Docker is running"

# ── 2. .env file ──────────────────────────────────────────────────────────────
Step "Checking .env..."
$envFile  = Join-Path $root ".env"
$jwtKeys  = Join-Path $root "jwt-keys.txt"

if (!(Test-Path $envFile)) {
    if (Test-Path $jwtKeys) {
        Copy-Item $jwtKeys $envFile
        Ok ".env created from jwt-keys.txt"
    } else {
        Fail ".env missing and jwt-keys.txt not found. Create .env with JWT_PRIVATE_KEY and JWT_PUBLIC_KEY."
    }
} else {
    Ok ".env already exists"
}

# ── 3. Build & start all services ─────────────────────────────────────────────
Step "Building and starting services (postgres, redis, backend, worker, frontend)..."
Push-Location $root
try {
    docker-compose up --build -d
    if ($LASTEXITCODE -ne 0) { throw "docker-compose up failed" }
} finally {
    Pop-Location
}
Ok "All containers started"

# ── 4. Wait for PostgreSQL ─────────────────────────────────────────────────────
Step "Waiting for PostgreSQL..."
$retries = 30
$ready   = $false
while ($retries -gt 0 -and -not $ready) {
    docker-compose -f (Join-Path $root "docker-compose.yml") exec -T postgres `
        pg_isready -U dev -d documind 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true } else { Start-Sleep 2; $retries-- }
}
if (-not $ready) { Fail "PostgreSQL did not become ready after 60 s" }
Ok "PostgreSQL is ready"

# ── 5. Run migrations ──────────────────────────────────────────────────────────
Step "Running database migrations..."
docker-compose -f (Join-Path $root "docker-compose.yml") exec -T backend `
    node dist/infrastructure/database/migrate.js
if ($LASTEXITCODE -ne 0) { Fail "Migrations failed — check logs with: docker-compose logs backend" }
Ok "Migrations complete"

# ── 6. Summary ────────────────────────────────────────────────────────────────
Step "DocuMind AI is up!"
docker-compose -f (Join-Path $root "docker-compose.yml") ps

Write-Host ""
Write-Host "  Frontend  : http://localhost:3000" -ForegroundColor Yellow
Write-Host "  API       : http://localhost:8080"  -ForegroundColor Yellow
Write-Host "  Postgres  : localhost:5433  (user: dev  pass: dev  db: documind)" -ForegroundColor Yellow
Write-Host "  Redis     : localhost:6379"          -ForegroundColor Yellow
Write-Host ""
Write-Host "  Stop all  : docker-compose down"                     -ForegroundColor DarkGray
Write-Host "  All logs  : docker-compose logs -f"                  -ForegroundColor DarkGray
Write-Host "  One svc   : docker-compose logs -f worker"           -ForegroundColor DarkGray
