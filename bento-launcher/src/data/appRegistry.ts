import type { AppDefinition } from '../types';

export const appRegistry: AppDefinition[] = [
  // ── 01 — Estimación Manual de Gravedad ──
  {
    id: 'manual-gravity',
    name: 'Estimación Manual de Gravedad',
    description:
      'Ingresa datos de tiempo y posición de un objeto en caída libre para estimar g mediante ajuste de curva (curve_fit). Visualiza la trayectoria experimental vs. el modelo teórico y = ½gt².',
    icon: '🍎',
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

  // ── 02 — Gravity Tracker Automatizado ──
  {
    id: 'gravity-tracker-web',
    name: 'Gravity Tracker — Automatizado',
    description:
      'Suite analítica avanzada que estima g procesando cinemáticamente videos de caída libre con visión computacional, calibración px→m y ajustes numéricos de alta fidelidad (R² ≈ 0.99).',
    icon: '🎯',
    accentColor: '#3b82f6',
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
      'Detecta automáticamente los rebotes de una pelota procesando video con visión computacional (OpenCV). Calcula el coeficiente de restitución (e) analizando las alturas y visualiza la decadencia energética.',
    icon: '🏀',
    accentColor: '#10b981',
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
      'Analiza el periodo de oscilación procesando video en tiempo real. Usa visión computacional para rastrear la masa y FFT para encontrar la frecuencia dominante, estimando la gravedad automáticamente.',
    icon: '🕰️',
    accentColor: '#8b5cf6',
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
