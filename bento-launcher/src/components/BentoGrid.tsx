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
     * Layout strategy:
     *
     * mobile  (< 640px)  → 1 col, each tile auto height (stacked list)
     * sm      (640-1024) → 2 cols, each tile auto height (pairs)
     * lg      (≥ 1024px) → 4 cols, fixed row height 280px
     *                       hero tile (row-span-2) = 280*2 + gap = ~585px
     *                       wide tiles (col-span-2) fill the row naturally
     *
     * Key: grid-rows-[280px] on lg ensures ALL tiles in the same row
     * share exactly the same height. The wrapper div and BentoTile both
     * carry h-full so the tile stretches to fill its grid cell.
     */
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[280px]">
      {apps.map((app) => (
        <div key={app.id} className={`${getGridClasses(app.gridSize)} h-full`}>
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
