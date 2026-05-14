# 04 — Péndulo Simple

Aplicación web que analiza el movimiento armónico simple de un péndulo procesando video en tiempo real. Usa seguimiento de color para obtener la posición angular y aplica una **Transformada Rápida de Fourier (FFT)** para encontrar la frecuencia dominante, permitiendo calcular la gravedad a partir del período de oscilación.

---

## 🏗️ Arquitectura

```
04_simple_pendulum/
├── backend/          # FastAPI — puerto 8003
│   ├── main.py
│   └── requirements.txt
├── frontend/         # React + TypeScript + Vite + Tailwind — puerto 5176
│   └── src/
├── report/           # Reporte LaTeX
├── pendulum_analyzer.ipynb   # Notebook de referencia
├── pendulum_analyzer.py
├── simular_pendulo.py
└── run.sh            # Script de arranque unificado
```

## 🚀 Ejecución rápida

```bash
cd 04_simple_pendulum
bash run.sh
```

- **Frontend:** http://localhost:5176
- **Backend API:** http://localhost:8003
- **Docs API:** http://localhost:8003/docs

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

La relación entre período y gravedad para un péndulo simple:

```
T = 2π √(L/g)  →  g = 4π²L / T²
```

El pipeline:
1. **Tracking de color** — se sigue el centroide del péndulo fotograma a fotograma
2. **Señal angular** — se extrae `θ(t)` a partir de la posición del centroide
3. **FFT** — se identifica la frecuencia dominante `f₀` en el espectro de potencia
4. **Cálculo de g** — `g = 4π²L·f₀²` con la longitud `L` ingresada por el usuario

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3, FastAPI, OpenCV, scipy, numpy |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Análisis espectral | numpy.fft |
| Visualización | Recharts |
