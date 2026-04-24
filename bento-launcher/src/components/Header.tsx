import { useState } from 'react';

export default function Header() {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="relative px-6 pt-12 pb-6 sm:px-8 sm:pt-16 sm:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-6">
          {/* UTB Logo */}
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 blur-lg bg-white/10 rounded-[1.5rem]" />
            {logoError ? (
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white/[0.03] border border-white/10 text-xl font-bold tracking-tighter text-white shadow-xl backdrop-blur-md">
                UTB
              </div>
            ) : (
              <img
                src="/logos/utb-logo.png"
                alt="Logo UTB"
                className="relative h-16 w-16 rounded-[1.25rem] object-contain border border-white/10 shadow-xl"
                onError={() => setLogoError(true)}
              />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tighter text-white sm:text-5xl" style={{ letterSpacing: '-0.03em' }}>
              Sensado y Modelado{' '}
              <span className="text-zinc-400 font-light" style={{ letterSpacing: '-0.02em' }}>
                de Sistemas Físicos
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] font-light leading-relaxed text-zinc-500 tracking-wide">
              Hub central del repositorio — notebooks, aplicaciones y herramientas analíticas avanzadas del curso de la UTB.
            </p>
          </div>
        </div>

        {/* Subtle separator */}
        <div className="mt-10 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent shadow-[0_1px_10px_rgba(255,255,255,0.05)]" />
      </div>
    </header>
  );
}
