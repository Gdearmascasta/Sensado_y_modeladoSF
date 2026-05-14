import type { AppDefinition } from '../types';
import { Weight, Crosshair, Repeat2, Clock, Satellite } from 'lucide-react';

export const appRegistry: AppDefinition[] = [
  // ── 01 — Estimación Manual de Gravedad ──────────────────────────────────
  // 1×1: tile compacto, introductorio
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
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8001)',
        command: 'cd 01_manual_gravity_estimation/backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5173)',
        command: 'cd 01_manual_gravity_estimation/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 02 — Gravity Tracker Automatizado ───────────────────────────────────
  // 2×2 HERO: la más visual, la parábola animada merece espacio
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
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8000)',
        command: 'cd 02_automated_gravity_tracker/backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5174)',
        command: 'cd 02_automated_gravity_tracker/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 03 — Coeficiente de Restitución ─────────────────────────────────────
  // 1×1: tile compacto, rebotes en miniatura
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
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8002)',
        command: 'cd 03_coefficient_restitution/backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5175)',
        command: 'cd 03_coefficient_restitution/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 04 — Péndulo Simple ──────────────────────────────────────────────────
  // 2×1: la onda sinusoidal de la FFT se luce en horizontal
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
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8003)',
        command: 'cd 04_simple_pendulum/backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python main.py',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5176)',
        command: 'cd 04_simple_pendulum/frontend && npm install && npm run dev',
      },
    ],
  },

  // ── 05 — Imágenes Satelitales ────────────────────────────────────────────
  // 2×1: el mapa de clasificación se luce en horizontal
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
    launchSteps: [
      {
        label: '1. Iniciar Backend (FastAPI — puerto 8004)',
        command: 'cd 05_satellite_images/backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8004 --reload',
      },
      {
        label: '2. Iniciar Frontend (React — puerto 5177)',
        command: 'cd 05_satellite_images/frontend && npm install && npm run dev',
      },
    ],
  },
];
