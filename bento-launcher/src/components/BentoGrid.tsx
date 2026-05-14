import type { AppDefinition } from '../types';
import { getGridClasses } from '../utils/gridUtils';
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
    /*
     * Responsive grid:
     *   mobile  → 1 column
     *   sm      → 2 columns
     *   lg      → 4 columns (true bento asymmetry)
     *
     * Each tile declares its own col-span / row-span via getGridClasses().
     * grid-rows: auto lets tiles with rowSpan:2 expand naturally.
     */
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-5">
      {apps.map((app) => (
        <div key={app.id} className={getGridClasses(app.gridSize)}>
          <BentoTile
            app={app}
            onClick={() => onAppClick(app)}
            status={appStates[app.id] || 'idle'}
          />
        </div>
      ))}
    </div>
  );
}
