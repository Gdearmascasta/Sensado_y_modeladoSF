import { useState } from 'react';

export default function InfoCard() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="noise-overlay relative col-span-2 row-span-2 flex flex-col items-center justify-center overflow-hidden rounded-3xl glass-card p-8 text-center">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-primary/5 blur-[80px]" />

      {/* UTB Logo */}
      <div className="relative z-10">
        {logoError ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 text-xl font-black text-primary">
            UTB
          </div>
        ) : (
          <img
            src="/logos/utb-logo.png"
            alt="Logo UTB"
            className="h-20 w-20 rounded-2xl object-contain ring-1 ring-white/5"
            onError={() => setLogoError(true)}
          />
        )}
      </div>

      <h2 className="relative z-10 mt-5 text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
        Sensado y Modelado
        <span className="block text-base font-medium text-zinc-500">de Sistemas Físicos</span>
      </h2>

      <p className="relative z-10 mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
        Repositorio del curso de la UTB. Contiene notebooks, aplicaciones de
        escritorio y web para el análisis de fenómenos físicos.
      </p>

      {/* Decorative sine wave */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-sine opacity-50" />
    </div>
  );
}
