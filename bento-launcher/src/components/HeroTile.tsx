import { useState } from 'react';

/**
 * HeroTile — tile informativo compacto del bento (2×1).
 *
 * En una bento app real el branding vive dentro del mosaico, pero como
 * acento, no como centerpiece. Por eso este tile es horizontal: logo a la
 * izquierda, título + meta a la derecha. Las apps reales son las que se
 * llevan el protagonismo visual.
 *
 * No es interactivo.
 */
export default function HeroTile() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div
      className="
        noise-overlay relative h-full overflow-hidden rounded-3xl glass-card glow-blue
        flex items-center gap-5
        p-6 sm:p-7
      "
      aria-label="Sensado y Modelado de Sistemas Físicos"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Decorative corner glow */}
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-blue-500/10 blur-[60px]" />

      {/* Logo */}
      <div className="relative z-10 flex-shrink-0">
        <div className="absolute inset-0 rounded-[1.1rem] bg-white/10 blur-md" />
        {logoError ? (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-sm font-bold tracking-tight text-white shadow-xl backdrop-blur-md sm:h-14 sm:w-14">
            UTB
          </div>
        ) : (
          <img
            src="/logos/utb-logo.png"
            alt="Logo UTB"
            className="relative h-12 w-12 rounded-[1rem] border border-white/10 object-contain shadow-xl sm:h-14 sm:w-14"
            onError={() => setLogoError(true)}
          />
        )}
      </div>

      {/* Title + meta */}
      <div className="relative z-10 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          UTB · 2025
        </p>
        <h1
          className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl"
          style={{ letterSpacing: '-0.03em' }}
        >
          Sensado y Modelado{' '}
          <span className="bg-gradient-to-br from-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            de Sistemas Físicos
          </span>
        </h1>
        <p className="mt-1.5 truncate text-xs font-medium text-zinc-400 sm:text-sm">
          Hub del repositorio · notebooks y aplicaciones del curso.
        </p>
      </div>
    </div>
  );
}
