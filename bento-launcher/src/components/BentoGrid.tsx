import type { AppDefinition } from '../types';
import { getGridClasses } from '../utils/gridUtils';
import BentoTile from './BentoTile';
import EditorialTile from './EditorialTile';
import HeroTile from './HeroTile';
import TopicsTile from './TopicsTile';

interface BentoGridProps {
  apps: AppDefinition[];
  onAppClick: (app: AppDefinition) => void;
  appStates: Record<string, 'idle' | 'launching' | 'running'>;
}

/**
 * Bento layout (lg+, 4 cols × 4 rows = 16 cells, sin huecos):
 *
 * ┌──────────────┬──────┬──────┐
 * │  HERO  2×1   │  01  │  03  │   fila 1
 * ├──────────────┴──────┬──────┤
 * │                     │ TOP  │   fila 2
 * │      02   3×2       │ ICS  │
 * │                     │ 1×2  │   fila 3
 * ├──────────────┬──────┴──────┤
 * │   04   2×1   │   05   2×1  │   fila 4
 * └──────────────┴─────────────┘
 *
 * 2 + 1 + 1 + 6 + 2 + 2 + 2 = 16 ✓
 *
 * Cinco tamaños distintos (2×1 hero, 1×1, 3×2, 1×2 sidebar, 2×1) — esa
 * variedad es lo que define el ritmo bento. La tile 02 (3×2) es el ancla
 * visual; Topics como sidebar vertical aprovecha el 1/4 restante.
 */
export default function BentoGrid({ apps, onAppClick, appStates }: BentoGridProps) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 text-5xl opacity-20">📦</div>
        <p className="text-sm font-medium text-zinc-500">
          No hay aplicaciones configuradas
        </p>
      </div>
    );
  }

  // Split apps by role in the layout:
  //   • smallApps (1×1)  → next to Hero in row 1
  //   • heroApp  (3×2)   → centerpiece, paired with TopicsTile sidebar
  //   • wideApps (2×1)   → bottom row
  const smallApps = apps.filter((a) => a.gridSize.colSpan === 1 && a.gridSize.rowSpan === 1);
  const heroApp   = apps.find((a) => a.gridSize.colSpan === 3 && a.gridSize.rowSpan === 2);
  const wideApps  = apps.filter((a) => a.gridSize.colSpan === 2 && a.gridSize.rowSpan === 1);

  /**
   * Pick the right tile renderer:
   *   - apps with editorial meta → EditorialTile (new científico-técnico style)
   *   - apps without meta        → BentoTile (legacy)
   * This lets us migrate tiles one by one without breaking the layout.
   */
  const renderTile = (app: AppDefinition) => {
    const status = appStates[app.id] || 'idle';
    if (app.meta) {
      return (
        <EditorialTile app={app} onClick={() => onAppClick(app)} status={status} />
      );
    }
    return <BentoTile app={app} onClick={() => onAppClick(app)} status={status} />;
  };

  return (
    <div className="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-4">

      {/* ── Row 1: Hero branding + small apps ── */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-2">
        <HeroTile />
      </div>

      {smallApps.map((app) => (
        <div key={app.id} className={getGridClasses(app.gridSize)}>
          {renderTile(app)}
        </div>
      ))}

      {/* ── Rows 2-3: Hero block (3/4) + Topics sidebar (1/4) ── */}
      {heroApp && (
        <div className={getGridClasses(heroApp.gridSize)}>
          {renderTile(heroApp)}
        </div>
      )}

      <div className="col-span-1 lg:col-span-1 lg:row-span-2">
        <TopicsTile />
      </div>

      {/* ── Row 4: wide apps ── */}
      {wideApps.map((app) => (
        <div key={app.id} className={getGridClasses(app.gridSize)}>
          {renderTile(app)}
        </div>
      ))}
    </div>
  );
}
