import type { AppDefinition } from '../types';
import { Weight, Crosshair, Repeat2, Clock } from 'lucide-react';

export const appRegistry: AppDefinition[] = [
  // ── 01 — Estimación Manual de Gravedad ──
  {
    id: 'manual-gravity',
    name: 'Estimación Manual de Gravedad',
    description:
      'Ingresa datos de tiempo y posición de un objeto en caída libre para estimar g usando ajuste de curva (curve_fit). Visualiza la trayectoria experimental vs. el modelo teórico y = ½gt².',
    icon: Weight,
    accentColor: '#f59e0b', // Amber/Teal glow base
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

  // ── 02 — Gravity Tracker Automatizado ──
  {
    id: 'gravity-tracker-web',
    name: 'Gravity Tracker — Automatizado',
    description:
      'Suite analítica avanzada que estima g procesando cinemáticamente videos de caída libre con visión computacional, calibración px→m y ajustes numéricos de alta fidelidad.',
    icon: Crosshair,
    accentColor: '#06b6d4', // Cyan/Blue glow base
    gridSize: { colSpan: 1, rowSpan: 1 },
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

  // ── 03 — Coeficiente de Restitución ──
  {
    id: 'restitution-calculator',
    name: 'Coeficiente de Restitución — Automatizado',
    description:
      'Detecta automáticamente los rebotes procesando video con visión computacional. Calcula el coeficiente de restitución analizando las alturas y visualiza la decadencia energética.',
    icon: Repeat2,
    accentColor: '#8b5cf6', // Violet
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

  // ── 04 — Péndulo Simple ──
  {
    id: 'simple-pendulum',
    name: 'Péndulo Simple — Automatizado',
    description:
      'Analiza el período de oscilación procesando video en tiempo real. Usa visión computacional y FFT para encontrar la frecuencia dominante, estimando la gravedad automáticamente.',
    icon: Clock,
    accentColor: '#3b82f6', // Blue
    gridSize: { colSpan: 1, rowSpan: 1 },
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
];
