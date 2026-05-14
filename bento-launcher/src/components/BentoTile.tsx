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

/** True when this tile occupies a 2×2 hero slot */
function isHero(app: AppDefinition) {
  return app.gridSize.colSpan === 2 && app.gridSize.rowSpan === 2;
}

/** True when this tile is wide (2×1) */
function isWide(app: AppDefinition) {
  return app.gridSize.colSpan === 2 && app.gridSize.rowSpan === 1;
}

export default function BentoTile({ app, onClick, status }: BentoTileProps) {
  const glowClass = glowMap[app.accentColor] || '';
  const iconColor = app.accentColor;
  const Icon = app.icon;
  const hero = isHero(app);
  const wide = isWide(app);

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

        {/* Description */}
        <p className={`mt-3 leading-relaxed text-zinc-400 font-light flex-grow ${hero ? 'text-[15px]' : 'text-[14px]'}`}>
          {app.description}
        </p>

        {/* ── Data Visualizations ── */}

        {/* Manual gravity — parabola (compact) */}
        {app.id === 'manual-gravity' && (
          <div className="mt-5 mb-3 flex flex-col space-y-2">
            <span className="text-[13px] text-zinc-400 font-serif italic tracking-wide">
              y = <span className="font-sans">½</span>gt<sup className="font-sans">2</sup>
            </span>
            <div className="relative h-12 w-full border-l border-b border-zinc-700/50">
              <div className="absolute left-0 bottom-0 w-full h-full opacity-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:10px_10px]" />
              <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d="M 0 30 Q 50 25 100 0" fill="none" stroke={app.accentColor} strokeWidth="2" strokeLinecap="round" className="drop-shadow-md" />
              </svg>
            </div>
          </div>
        )}

        {/* Gravity tracker HERO — expanded animated scatter + fit curve */}
        {app.id === 'gravity-tracker-web' && (
          <div className="mt-6 mb-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-zinc-400 font-mono tracking-wider">R² ≈ 0.99</span>
              <span className="text-[11px] text-zinc-600 font-mono">g ≈ 9.81 m/s²</span>
            </div>
            {/* Larger chart for hero tile */}
            <div className="relative border-l border-b border-zinc-700/40 rounded-bl-sm" style={{ height: hero ? '100px' : '48px' }}>
              {/* Grid */}
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:20%_25%]" />
              <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                {/* Scatter points */}
                {[[10,45],[20,38],[30,28],[40,20],[55,12],[70,6],[85,2],[95,0.5]].map(([x,y], i) => (
                  <circle key={i} cx={x} cy={y} r="2.5" fill="white" fillOpacity="0.6" stroke={app.accentColor} strokeWidth="1" />
                ))}
                {/* Fit curve */}
                <path
                  d="M 0 50 Q 50 40 100 0"
                  fill="none"
                  stroke={app.accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="drop-shadow-md"
                />
              </svg>
            </div>
            {/* Axis labels */}
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono px-1">
              <span>t (s)</span>
              <span>y (m)</span>
            </div>
          </div>
        )}

        {/* Restitution — bounce decay (compact) */}
        {app.id === 'restitution-calculator' && (
          <div className="mt-5 mb-3 flex flex-col space-y-2">
            <span className="text-[13px] text-zinc-400 font-mono tracking-wider">e = 0.85</span>
            <div className="relative h-12 w-full border-b border-zinc-700/50">
              <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                <path d="M 0 30 Q 12 0 25 30 Q 35 10 45 30 Q 53 17 60 30 Q 66 22 72 30 Q 77 26 81 30" fill="none" stroke={app.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
                <path d="M 12 0 L 35 10 L 53 17 L 66 22 L 77 26" fill="none" stroke={app.accentColor} strokeWidth="1" strokeDasharray="3 3" className="opacity-50" />
              </svg>
            </div>
          </div>
        )}

        {/* Simple pendulum — sine wave, wider in 2×1 tile */}
        {app.id === 'simple-pendulum' && (
          <div className="mt-5 mb-3 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-zinc-400 font-mono tracking-wider">
                FFT PEAK: <span className="text-white font-medium">1.2 Hz</span>
              </span>
              {wide && <span className="text-[11px] text-zinc-600 font-mono">T = 0.83 s</span>}
            </div>
            <div className="relative h-12 w-full">
              <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
                {/* More cycles visible in wide tile */}
                <path
                  d={wide
                    ? "M 0 15 Q 6.25 0 12.5 15 T 25 15 T 37.5 15 T 50 15 T 62.5 15 T 75 15 T 87.5 15 T 100 15"
                    : "M 0 15 Q 12.5 0 25 15 T 50 15 T 75 15 T 100 15"
                  }
                  fill="none"
                  stroke={app.accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="drop-shadow-md"
                />
                <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2 4" />
              </svg>
            </div>
          </div>
        )}

        {/* Satellite images — spectral index bars, wide layout */}
        {app.id === 'satellite-images' && (
          <div className="mt-5 mb-3 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-zinc-400 font-mono tracking-wider">NDVI · BSI · NDWI</span>
              {wide && <span className="text-[11px] text-zinc-600 font-mono">Sentinel-2 L2A</span>}
            </div>
            {/* Mini bar chart representing index distributions */}
            <div className="flex items-end gap-1 h-12">
              {[0.72, 0.45, 0.88, 0.31, 0.60, 0.95, 0.40, 0.78, 0.55, 0.83, 0.25, 0.67].map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-300 group-hover:opacity-90"
                  style={{
                    height: `${v * 100}%`,
                    backgroundColor: app.accentColor,
                    opacity: 0.3 + v * 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
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
