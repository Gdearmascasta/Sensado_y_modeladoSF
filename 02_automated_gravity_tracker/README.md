# 02 — Gravity Tracker Automatizado

Suite analítica que estima la aceleración gravitacional **g** procesando cinemáticamente videos de caída libre. Usa visión computacional (OpenCV) para segmentar el objeto por color HSV, rastrear su centroide fotograma a fotograma y aplicar ajustes numéricos de alta fidelidad.

---

## 🏗️ Arquitectura

```
02_automated_gravity_tracker/
├── backend/          # FastAPI — puerto 8000
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + TypeScript + Vite + Tailwind — puerto 5174
│   └── src/
├── gravity_app/      # Módulos de visión computacional
├── report/           # Reporte LaTeX
├── videos/           # Videos de ejemplo
├── app_gravedad.py   # CLI script
├── run_app.py        # App de escritorio PyQt6
├── requirements.txt
└── run.sh            # Script de arranque unificado
```

## 🚀 Ejecución rápida

```bash
cd 02_automated_gravity_tracker
bash run.sh
```

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:8000
- **Docs API:** http://localhost:8000/docs

## 🔧 Ejecución manual

### App Web (Backend + Frontend)
```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py

# Frontend (nueva terminal)
cd frontend
npm install && npm run dev
```

### App de Escritorio (PyQt6)
```bash
pip install -r requirements.txt
python run_app.py
```

### CLI Script
```bash
pip install -r requirements.txt
python app_gravedad.py
```

## 📐 Pipeline de Procesamiento

1. **Carga del video** — el usuario sube un video de caída libre
2. **Segmentación HSV** — se aísla el objeto por rango de color configurable
3. **Tracking de centroide** — se extrae la posición `y(t)` fotograma a fotograma
4. **Calibración px→m** — conversión de píxeles a metros con referencia física
5. **Ajuste numérico** — `curve_fit` sobre `y = y₀ + v₀t + ½gt²`
6. **Visualización** — gráfica interactiva con curva ajustada y métricas de error

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, FastAPI, OpenCV, scipy, numpy |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Desktop | PyQt6 |
| Visualización | Recharts, Matplotlib |
