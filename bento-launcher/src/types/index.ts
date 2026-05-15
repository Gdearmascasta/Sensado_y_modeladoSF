import { ElementType } from 'react';

export type LaunchType = 'enlace_web' | 'comando_local' | 'notebook' | 'documento' | 'info';

export type GridSize = { colSpan: 1 | 2 | 3; rowSpan: 1 | 2 };

export interface LaunchStep {
  label: string;
  command: string;
}

/**
 * Editorial metadata used by the new tile design (científico-técnico).
 * Keeps each tile from feeling like a marketing card by exposing the
 * physics behind it: a one-line equation, a short tag (kind of physics),
 * and an example measured value.
 */
export interface ExperimentMeta {
  /** Short tag like "MECÁNICA · CINEMÁTICA" */
  tag: string;
  /** Governing equation, plain text — can include unicode (½, π, √, ²). */
  equation: string;
  /** Example or representative measured value (with units). */
  metric: { label: string; value: string };
  /** Tech stack pill, e.g. "FastAPI · OpenCV · React". */
  stack?: string;
  /** Punchy single-line caption, replaces the long description on the tile. */
  tagline?: string;
}

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: ElementType;
  accentColor: string;
  gridSize: GridSize;
  launchType: LaunchType;
  url?: string;
  previewUrl?: string;
  launchSteps?: LaunchStep[];
  /** Optional editorial metadata for the new tile design. */
  meta?: ExperimentMeta;
}

export interface ModalState {
  isOpen: boolean;
  app: AppDefinition | null;
}
