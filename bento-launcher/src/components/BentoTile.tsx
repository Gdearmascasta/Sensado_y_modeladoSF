import type { AppDefinition } from '../types';
import { ArrowRight } from 'lucide-react';

interface BentoTileProps {
  app: AppDefinition;
  onClick: () => void;
  status: 'idle' | 'launching' | 'running';
}

const glowMap: Record<string, string> = {
  '#f59e0b': 'glow-amber',
  '#06b6d4': 'glow-cyan',
  '#8b5cf6': 'glow-violet',
  '#5b21b6': 'glow-deepviolet',
  '#3b82f6': 'glow-blue',
  '#10b981': 'glow-emerald',
};

function isHero(app: AppDefinition) {
  return app.gridSize.colSpan === 2 && app.gridSize.rowSpan === 2;
}

export default function BentoTile({ app, onClick, status }: BentoTileProps) {
  const glowClass = glowMap[app.accentColor] || '';
  const iconColor = app.accentColor;
  const Icon = app.icon;
  const hero = isHero(app);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        group noise-overlay relative cursor-pointer overflow-hidden rounded-3xl glass-card
        transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]
        hover:-translate-y-2 hover:rotate-[0.5deg] hover:shadow-glow-xl
        ${glowClass}
        flex flex-col
        ${hero ? 'p-8 sm:p-10' : 'p-7 sm:p-8'}
        h-full
      `}
    >
      {/* Corner glow orbs */}
      <div
        className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-30"
        style={{ backgroundColor: app.accentColor }}
      />
      <div
        className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full opacity-0 blur-[50px] transition-opacity duration-700 group-hover:opacity-20"
        style={{ backgroundColor: app.accentColor }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-[1.5px] opacity-30 transition-opacity duration-300 group-hover:opacity-80"
        style={{
          background: `linear-gradient(90deg, transparent, ${app.accentColor}, transparent)`,
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Icon */}
        <div className={`transition-transform duration-700 group-hover:animate-float ${hero ? 'mb-8' : 'mb-6'}`}>
          <div
            className={`inline-flex items-center justify-center rounded-[16px] bg-[#1e293b]/80 backdrop-blur-sm border border-white/10 transition-colors duration-500 group-hover:bg-white/[0.05] group-hover:border-white/20 ${hero ? 'p-[20px]' : 'p-[16px]'}`}
            aria-hidden="true"
            style={{ boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.05)' }}
          >
            <div className="filter drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
              <Icon size={hero ? 36 : 28} color={iconColor} strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Name */}
        <h3
          className={`font-bold tracking-tight text-white ${hero ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          {app.name}
        </h3>

        {/* Description — now has room to breathe */}
        <p className={`mt-3 leading-relaxed text-zinc-400 font-light flex-grow ${hero ? 'text-[15px]' : 'text-[14px]'}`}>
          {app.description}
        </p>

        {/* Footer */}
        <div className="mt-7 flex items-center justify-between">
          {/* Status badge */}
          <div className="flex items-center space-x-2 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-1.5 backdrop-blur-md shadow-sm">
            {status === 'running' && (
              <>
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ backgroundColor: app.accentColor, boxShadow: `0 0 10px ${app.accentColor}` }}
                />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Activa</span>
              </>
            )}
            {status === 'launching' && (
              <>
                <span className="h-2 w-2 animate-spin rounded-full border-t-white border-r-transparent border-b-transparent border-l-transparent border-[1.5px]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/90">Iniciando</span>
              </>
            )}
            {status === 'idle' && (
              <>
                <span className="h-2 w-2 rounded-full bg-zinc-600 shadow-inner" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Inactiva</span>
              </>
            )}
          </div>

          {/* CTA arrow */}
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] border border-white/10 transition-all duration-500 relative overflow-hidden ${
              status === 'running'
                ? 'opacity-100 shadow-xl translate-x-1'
                : 'opacity-70 group-hover:opacity-100 group-hover:translate-x-1 group-hover:shadow-xl'
            }`}
          >
            <div
              className={`absolute inset-0 blur-md transition-opacity ${
                status === 'running' ? 'opacity-60 animate-pulse' : 'opacity-0 group-hover:opacity-50'
              }`}
              style={{ backgroundColor: app.accentColor }}
            />
            <ArrowRight
              size={18}
              className={`text-white relative z-10 transition-transform ${
                status === 'running' ? 'scale-110' : 'group-hover:scale-110'
              }`}
              strokeWidth={2.5}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
