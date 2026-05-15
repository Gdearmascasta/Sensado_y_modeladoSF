import type { AppDefinition } from '../types';
import { Weight, Crosshair, Repeat2, Clock, Satellite } from 'lucide-react';

export const appRegistry: AppDefinition[] = [
  // ── 01 — Estimación Manual de Gravedad ──────────────────────────────────
  {
    id: 'manual-gravity',
    name: 'Estimación Manual de Gravedad',
    description:
      'Ingresa datos de tiempo y posición de un objeto en caída libre para estimar g usando ajuste de curva (curve_fit). Visualiza la trayectoria experimental vs. el modelo teórico y = ½gt².',
    icon: Weight,
    accentColor: '#f59e0b',
    gridSize: { colSpan: 1, rowSpan: 1 },
    launchType: 'comando_local',
    previewUrl: 'http://localhost:5173',
    meta: {
      tag: 'MECÁNICA · CAÍDA LIBRE',
      equation: 'y = ½ g t²',
      // TODO: reemplazar con tu valor experimental real de g
      metric: { label: 'g estimada', value: '9.81 m/s²' },
      stack: 'scipy · FastAPI · React',
      tagline: 'Ajuste de curva sobre datos manuales.',
    },
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8001)',
        command: 'cd 01_manual_gravity_estimation/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5173)',
        command: 'cd 01_manual_gravity_estimation/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 02 — Gravity Tracker Automatizado ───────────────────────────────────
  // 3×2 HERO: la más visual, merece el bloque central
  {
    id: 'gravity-tracker-web',
    name: 'Gravity Tracker — Automatizado',
    description:
      'Suite analítica avanzada que estima g procesando cinemáticamente videos de caída libre con visión computacional, calibración px→m y ajustes numéricos de alta fidelidad.',
    icon: Crosshair,
    accentColor: '#06b6d4',
    gridSize: { colSpan: 3, rowSpan: 2 },
    launchType: 'comando_local',
    previewUrl: 'http://localhost:5174',
    meta: {
      tag: 'VISIÓN COMPUTACIONAL · CINEMÁTICA',
      equation: 'y(t) = y₀ + v₀t + ½ g t²',
      // TODO: reemplazar con tu valor experimental real de g por video
      metric: { label: 'g por video', value: '9.76 m/s²' },
      stack: 'OpenCV · NumPy · FastAPI · React',
      tagline: 'Tracking px→m frame a frame, ajuste parabólico.',
    },
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8000)',
        command: 'cd 02_automated_gravity_tracker/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5174)',
        command: 'cd 02_automated_gravity_tracker/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 03 — Coeficiente de Restitución ─────────────────────────────────────
  {
    id: 'restitution-calculator',
    name: 'Coeficiente de Restitución',
    description:
      'Detecta automáticamente los rebotes procesando video con visión computacional. Calcula el coeficiente de restitución analizando las alturas y visualiza la decadencia energética.',
    icon: Repeat2,
    accentColor: '#8b5cf6',
    gridSize: { colSpan: 1, rowSpan: 1 },
    launchType: 'comando_local',
    previewUrl: 'http://localhost:5175',
    meta: {
      tag: 'MECÁNICA · COLISIONES',
      equation: 'e = √(hₙ₊₁ / hₙ)',
      // TODO: reemplazar con tu valor experimental real de e
      metric: { label: 'e medido', value: '0.72' },
      stack: 'OpenCV · FastAPI · React',
      tagline: 'Decadencia exponencial de alturas de rebote.',
    },
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8002)',
        command: 'cd 03_coefficient_restitution/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5175)',
        command: 'cd 03_coefficient_restitution/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 04 — Péndulo Simple ──────────────────────────────────────────────────
  {
    id: 'simple-pendulum',
    name: 'Péndulo Simple — Automatizado',
    description:
      'Analiza el período de oscilación procesando video en tiempo real. Usa visión computacional y FFT para encontrar la frecuencia dominante, estimando la gravedad automáticamente.',
    icon: Clock,
    accentColor: '#3b82f6',
    gridSize: { colSpan: 2, rowSpan: 1 },
    launchType: 'comando_local',
    previewUrl: 'http://localhost:5176',
    meta: {
      tag: 'MECÁNICA · OSCILACIONES',
      equation: 'T = 2π √(L⁄g)',
      // TODO: reemplazar con tu valor experimental real de T y g
      metric: { label: 'g estimada', value: '9.78 m/s²' },
      stack: 'OpenCV · FFT · FastAPI',
      tagline: 'Frecuencia dominante por FFT sobre video.',
    },
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8003)',
        command: 'cd 04_simple_pendulum/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5176)',
        command: 'cd 04_simple_pendulum/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 05 — Imágenes Satelitales ────────────────────────────────────────────
  {
    id: 'satellite-images',
    name: 'Imágenes Satelitales — Clasificación',
    description:
      'Consulta imágenes Sentinel-2 del catálogo STAC de Planetary Computer, descarga bandas espectrales, calcula índices NDVI/BSI/NDWI y entrena un clasificador Random Forest para mapear vegetación, agua y minería.',
    icon: Satellite,
    accentColor: '#10b981',
    gridSize: { colSpan: 2, rowSpan: 1 },
    launchType: 'comando_local',
    previewUrl: 'http://localhost:5177',
    meta: {
      tag: 'SENSADO REMOTO · CLASIFICACIÓN',
      equation: 'NDVI = (NIR − R) / (NIR + R)',
      // TODO: reemplazar con tu área clasificada real o % de cobertura
      metric: { label: 'bandas Sentinel-2', value: 'B02 B03 B04 B08' },
      stack: 'STAC · scikit-learn · FastAPI · React',
      tagline: 'Random Forest sobre índices NDVI / BSI / NDWI.',
    },
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8004)',
        command: 'cd 05_satellite_images/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8004 --reload',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5177)',
        command: 'cd 05_satellite_images/frontend && npm install && npm run dev',
      },
    ],
  },
];
