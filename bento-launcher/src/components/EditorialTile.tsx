import type { AppDefinition } from '../types';
import GravityManualVisual from './visuals/GravityManualVisual';
import GravityTrackerVisual from './visuals/GravityTrackerVisual';
import RestitutionVisual from './visuals/RestitutionVisual';
import PendulumVisual from './visuals/PendulumVisual';
import SatelliteVisual from './visuals/SatelliteVisual';

interface Props {
  app: AppDefinition;
  onClick: () => void;
  status: 'idle' | 'launching' | 'running';
}

/**
 * EditorialTile — variante "científico-técnica" del bento tile.
 *
 * Tres layouts según el tamaño del tile:
 *   • 1×1 (compact)  — visual arriba, metadata abajo, todo comprimido
 *   • 2×1 (wide)     — visual izquierda (42%), metadata derecha
 *   • 3×2 (hero)     — visual ocupa 55% del alto, metadata debajo con
 *                       ecuación grande y dos columnas de métricas
 *
 * Sin glow ni shimmer: el contenido es el ruido visual.
 * Hairline de color en el top como firma del experimento.
 */
export default function EditorialTile({ app, onClick, status }: Props) {
  const meta = app.meta;
  if (!meta) return null;

  const cells = app.gridSize.colSpan * app.gridSize.rowSpan;
  const isHero    = cells >= 6; // 3×2
  const isCompact = cells === 1; // 1×1

  const Visual = (() => {
    switch (app.id) {
      case 'manual-gravity':      return <GravityManualVisual accent={app.accentColor} />;
      case 'gravity-tracker-web': return <GravityTrackerVisual accent={app.accentColor} />;
      case 'restitution-calculator': return <RestitutionVisual accent={app.accentColor} />;
      case 'simple-pendulum':     return <PendulumVisual accent={app.accentColor} />;
      case 'satellite-images':    return <SatelliteVisual accent={app.accentColor} />;
      default: return null;
    }
  })();

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className="
        group relative h-full cursor-pointer overflow-hidden rounded-3xl
        border border-white/[0.07] bg-zinc-950/40 backdrop-blur-xl
        transition-colors duration-300
        hover:border-white/[0.14] hover:bg-zinc-950/60
        flex flex-col
      "
    >
      {/* Hairline accent — color signature of the experiment */}
      <div
        className="h-[2px] w-full flex-shrink-0 opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${app.accentColor}, transparent)` }}
      />

      {/* ── HERO layout (3×2) ── */}
      {isHero && (
        <div className="flex flex-1 flex-col">
          {/* Visual — tall panel, 52% of height */}
          <div
            className="relative flex items-center justify-center border-b border-white/[0.06] px-8 py-6"
            style={{
              flex: '0 0 52%',
              background: 'radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.025), transparent 70%)',
            }}
          >
            {Visual}
          </div>

          {/* Metadata — bottom 48% */}
          <div className="flex flex-1 flex-col justify-between px-8 py-6">
            <header>
              <p className="font-mono-tech text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
                {meta.tag}
              </p>
              <h3
                className="font-serif-display mt-2 text-[28px] font-medium leading-[1.1] text-white"
                style={{ letterSpacing: '-0.02em' }}
              >
                {app.name}
              </h3>
              {/* Hero equation — large, italic, the centerpiece */}
              <p
                className="font-serif-display mt-4 text-[26px] italic leading-none text-zinc-200"
                style={{ letterSpacing: '0.01em' }}
              >
                {meta.equation}
              </p>
              {meta.tagline && (
                <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-zinc-400">
                  {meta.tagline}
                </p>
              )}
            </header>

            <footer className="mt-6 flex items-end justify-between gap-6">
              <div>
                <p className="font-mono-tech text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {meta.metric.label}
                </p>
                <p
                  className="font-mono-tech mt-1 text-[18px] font-semibold tabular-nums"
                  style={{ color: app.accentColor }}
                >
                  {meta.metric.value}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {meta.stack && (
                  <p className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                    {meta.stack}
                  </p>
                )}
                <StatusDot status={status} accent={app.accentColor} />
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* ── COMPACT layout (1×1) ── */}
      {isCompact && (
        <div className="flex flex-1 flex-col justify-between px-5 py-5">
          {/* Visual — small, top */}
          <div
            className="relative flex items-center justify-center rounded-xl border border-white/[0.05] px-3 py-3 mb-4"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.025), transparent 70%)',
            }}
          >
            {Visual}
          </div>

          <header>
            <p className="font-mono-tech text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              {meta.tag}
            </p>
            <h3
              className="font-serif-display mt-1.5 text-[17px] font-medium leading-[1.2] text-white"
              style={{ letterSpacing: '-0.015em' }}
            >
              {app.name}
            </h3>
            <p
              className="font-serif-display mt-2 text-[15px] italic leading-none text-zinc-300"
            >
              {meta.equation}
            </p>
          </header>

          <footer className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-mono-tech text-[9px] uppercase tracking-[0.14em] text-zinc-500">
                {meta.metric.label}
              </p>
              <p
                className="font-mono-tech mt-0.5 text-[13px] font-semibold tabular-nums"
                style={{ color: app.accentColor }}
              >
                {meta.metric.value}
              </p>
            </div>
            <StatusDot status={status} accent={app.accentColor} />
          </footer>
        </div>
      )}

      {/* ── WIDE layout (2×1) ── */}
      {!isHero && !isCompact && (
        <div className="flex flex-1 items-stretch">
          {/* Visual panel — left 42% */}
          <div
            className="relative flex w-[42%] flex-shrink-0 items-center justify-center border-r border-white/[0.06] px-5 py-6"
            style={{
              background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.03), transparent 70%)',
            }}
          >
            {Visual}
          </div>

          {/* Metadata panel — right */}
          <div className="flex flex-1 flex-col justify-between px-6 py-5">
            <header>
              <p className="font-mono-tech text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                {meta.tag}
              </p>
              <h3
                className="font-serif-display mt-2 text-[20px] font-medium leading-[1.15] text-white"
                style={{ letterSpacing: '-0.015em' }}
              >
                {app.name}
              </h3>
              <p
                className="font-serif-display mt-3 text-[18px] italic leading-none text-zinc-200"
                style={{ letterSpacing: '0.005em' }}
              >
                {meta.equation}
              </p>
              {meta.tagline && (
                <p className="mt-2.5 max-w-[28ch] text-[12px] leading-snug text-zinc-400">
                  {meta.tagline}
                </p>
              )}
            </header>

            <footer className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono-tech text-[9.5px] font-medium uppercase tracking-[0.16em] text-zinc-500">
                  {meta.metric.label}
                </p>
                <p
                  className="font-mono-tech mt-1 text-[14px] font-semibold tabular-nums"
                  style={{ color: app.accentColor }}
                >
                  {meta.metric.value}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {meta.stack && (
                  <p className="font-mono-tech text-[9.5px] uppercase tracking-[0.12em] text-zinc-500">
                    {meta.stack}
                  </p>
                )}
                <StatusDot status={status} accent={app.accentColor} />
              </div>
            </footer>
          </div>
        </div>
      )}
    </article>
  );
}

function StatusDot({ status, accent }: { status: 'idle' | 'launching' | 'running'; accent: string }) {
  if (status === 'running') {
    return (
      <span className="font-mono-tech inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]">
        <span className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
        <span className="text-zinc-300">activa</span>
      </span>
    );
  }
  if (status === 'launching') {
    return (
      <span className="font-mono-tech inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]">
        <span className="h-1.5 w-1.5 animate-spin rounded-full border-[1.2px] border-t-white border-r-transparent border-b-transparent border-l-transparent" />
        <span className="text-zinc-300">iniciando</span>
      </span>
    );
  }
  return (
    <span className="font-mono-tech inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
      <span className="text-zinc-500">en reposo</span>
    </span>
  );
}
