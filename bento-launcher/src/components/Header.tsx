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
            <h1 className="text-4xl font-extrabold text-white sm:text-6xl tracking-tight" style={{ letterSpacing: '-0.04em' }}>
              Sensado y Modelado<br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-zinc-300 to-zinc-600" style={{ letterSpacing: '-0.04em' }}>
                {' '}de Sistemas Físicos
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] font-medium leading-relaxed text-zinc-400 tracking-tight" style={{ letterSpacing: '-0.01em' }}>
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
