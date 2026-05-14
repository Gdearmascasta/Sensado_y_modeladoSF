#!/usr/bin/env bash
set -euo pipefail

# Define colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo -e "${BLUE}=== Starting Satellite Images App ===${NC}"

# Verificar que los puertos 8004 y 5177 estén libres (Req 9.9)
for PORT in 8004 5177; do
  if lsof -i ":$PORT" &>/dev/null; then
    echo -e "${RED}ERROR: el puerto $PORT ya está en uso. Libérelo antes de continuar.${NC}" >&2
    exit 1
  fi
done

# ── Backend ──────────────────────────────────────────────────────────────────
echo -e "${GREEN}[+] Configurando Backend (FastAPI en puerto 8004)...${NC}"
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  echo -e "${BLUE}    Creando entorno virtual...${NC}"
  python3 -m venv .venv || { echo -e "${RED}ERROR: fallo al crear el entorno virtual del backend.${NC}" >&2; exit 1; }
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo -e "${BLUE}    Instalando dependencias del backend...${NC}"
pip install -r requirements.txt || { echo -e "${RED}ERROR: fallo al instalar las dependencias del backend.${NC}" >&2; exit 1; }

echo -e "${GREEN}[+] Iniciando Backend en 0.0.0.0:8004...${NC}"
uvicorn main:app --host 0.0.0.0 --port 8004 &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo -e "${GREEN}[+] Configurando Frontend (Vite/React en puerto 5177)...${NC}"
cd "$FRONTEND_DIR"

echo -e "${BLUE}    Instalando dependencias del frontend...${NC}"
npm install || {
  echo -e "${RED}ERROR: fallo al ejecutar npm install en el frontend.${NC}" >&2
  kill "$BACKEND_PID" 2>/dev/null || true
  exit 1
}

echo -e "${GREEN}[+] Iniciando Frontend en 0.0.0.0:5177...${NC}"
npm run dev -- --host 0.0.0.0 --port 5177 &
FRONTEND_PID=$!

echo -e "${BLUE}=== App en ejecución. Presione Ctrl+C para detener ===${NC}"
echo -e "${BLUE}    Backend:  http://localhost:8004${NC}"
echo -e "${BLUE}    Frontend: http://localhost:5177${NC}"

# Función de limpieza: detiene ambos procesos al salir (Req 9.8)
cleanup() {
  echo -e "${BLUE}\nDeteniendo servicios...${NC}"
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Mantener el script activo
wait
