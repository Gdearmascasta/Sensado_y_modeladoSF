# 03 — Coeficiente de Restitución

Aplicación web que detecta automáticamente los rebotes de una pelota procesando video con visión computacional. Calcula el coeficiente de restitución `e` analizando la secuencia de alturas máximas y visualiza la decadencia energética entre impactos.

---

## 🏗️ Arquitectura

```
03_coefficient_restitution/
├── backend/          # FastAPI — puerto 8002
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + TypeScript + Vite + Tailwind — puerto 5175
│   └── src/
├── report/           # Reporte LaTeX
├── restitution_calculator.ipynb  # Notebook de referencia
├── restitution_calculator.py
├── simulador_video.py
├── video.mp4         # Video de ejemplo
└── run.sh            # Script de arranque unificado
```

## 🚀 Ejecución rápida

```bash
cd 03_coefficient_restitution
bash run.sh
```

- **Frontend:** http://localhost:5175
- **Backend API:** http://localhost:8002
- **Docs API:** http://localhost:8002/docs

## 🔧 Ejecución manual

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install && npm run dev
```

## 📐 Método

El coeficiente de restitución se define como:

```
e = v_rebote / v_impacto = √(h_{n+1} / h_n)
```

El pipeline:
1. **Detección de rebotes** — análisis de mínimos locales en la trayectoria vertical
2. **Extracción de alturas** — altura máxima entre rebotes consecutivos
3. **Cálculo de e** — promedio de los cocientes de alturas sucesivas
4. **Curva de decadencia** — ajuste exponencial `h_n = h_0 · e^(2n)`

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, FastAPI, OpenCV, scipy, numpy |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Visualización | Recharts, Matplotlib |
