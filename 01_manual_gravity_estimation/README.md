# 01 — Estimación Manual de Gravedad

Aplicación web interactiva para estimar la aceleración gravitacional **g** a partir de datos de caída libre ingresados manualmente. El usuario introduce pares (tiempo, posición) y el sistema ajusta el modelo teórico `y = ½gt²` usando `scipy.optimize.curve_fit`.

---

## 🏗️ Arquitectura

```
01_manual_gravity_estimation/
├── backend/          # FastAPI — puerto 8001
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + TypeScript + Vite + Tailwind — puerto 5173
│   └── src/
├── report/           # Reporte LaTeX
├── CaidaLibre_v1.ipynb   # Notebook de referencia
├── CaidaLibre_v1.py
└── run.sh            # Script de arranque unificado
```

## 🚀 Ejecución rápida

```bash
cd 01_manual_gravity_estimation
bash run.sh
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8001
- **Docs API:** http://localhost:8001/docs

## 🔧 Ejecución manual

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📐 Método

El ajuste de curva minimiza el error cuadrático entre los datos experimentales y el modelo:

```
y(t) = ½ · g · t²
```

El parámetro `g` se estima por mínimos cuadrados no lineales. La app muestra la curva ajustada superpuesta sobre los datos experimentales junto con el valor estimado de g y su incertidumbre.

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, FastAPI, scipy, numpy |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Visualización | Recharts |
