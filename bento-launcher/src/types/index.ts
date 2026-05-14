import { ElementType } from 'react';

export type LaunchType = 'enlace_web' | 'comando_local' | 'notebook' | 'documento' | 'info';

export type GridSize = { colSpan: 1 | 2 | 3; rowSpan: 1 | 2 };

export interface LaunchStep {
  label: string;
  command: string;
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
}

export interface ModalState {
  isOpen: boolean;
  app: AppDefinition | null;
}
