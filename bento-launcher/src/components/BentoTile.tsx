import type { AppDefinition } from '../types';

interface BentoTileProps {
  app: AppDefinition;
  onClick: () => void;
}

export default function BentoTile({ app, onClick }: BentoTileProps) {
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
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 h-[3px] w-full opacity-50 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: app.accentColor, boxShadow: `0 0 20px ${app.accentColor}` }}
      />

      {/* Background hover glow */}
      <div
        className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full opacity-0 blur-[80px] transition-opacity duration-700 group-hover:opacity-15"
        style={{ backgroundColor: app.accentColor }}
      />

      <div className="relative z-10 flex h-full flex-col">
        {/* Icon */}
        <span className="text-5xl drop-shadow-lg" aria-hidden="true">
          {app.icon}
        </span>

        {/* Name */}
        <h3 className="mt-5 text-xl font-bold tracking-tight text-zinc-100">
          {app.name}
        </h3>

        {/* Description */}
        <p className="mt-3 text-sm leading-relaxed text-zinc-400 font-light flex-grow">
          {app.description}
        </p>

        {/* Footer: badge + port indicator */}
        <div className="mt-5 flex items-center justify-between">
          <span
            className="inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: `${app.accentColor}1A`,
              color: app.accentColor,
            }}
          >
            Web App
          </span>
          {app.previewUrl && (
            <span className="text-[11px] text-zinc-500 font-mono">
              {app.previewUrl.replace('http://', '')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
