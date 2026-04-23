import type { AppDefinition } from '../types';
import BentoTile from './BentoTile';

interface BentoGridProps {
  apps: AppDefinition[];
  onAppClick: (app: AppDefinition) => void;
}

export default function BentoGrid({ apps, onAppClick }: BentoGridProps) {
  if (apps.length === 0) {
    return (
      <p className="py-12 text-center text-zinc-400">
        No hay aplicaciones configuradas
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {apps.map((app) => (
        <BentoTile key={app.id} app={app} onClick={() => onAppClick(app)} />
      ))}
    </div>
  );
}
