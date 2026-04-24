import type { AppDefinition } from '../types';
import BentoTile from './BentoTile';

interface BentoGridProps {
  apps: AppDefinition[];
  onAppClick: (app: AppDefinition) => void;
  appStates: Record<string, 'idle' | 'launching' | 'running'>;
}

export default function BentoGrid({ apps, onAppClick, appStates }: BentoGridProps) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4 opacity-20">📦</div>
        <p className="text-zinc-500 text-sm font-medium">
          No hay aplicaciones configuradas
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {apps.map((app) => (
        <BentoTile
          key={app.id}
          app={app}
          onClick={() => onAppClick(app)}
          status={appStates[app.id] || 'idle'}
        />
      ))}
    </div>
  );
}
