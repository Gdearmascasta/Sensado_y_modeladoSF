import { useState } from 'react';

export default function InfoCard() {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="col-span-2 row-span-2 flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-card p-6 text-center">
      {/* UTB Logo with fallback */}
      {logoError ? (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-800 text-lg font-bold text-primary">
          UTB
        </div>
      ) : (
        <img
          src="/logos/utb-logo.png"
          alt="Logo UTB"
          className="h-16 w-16 rounded-lg object-contain"
          onError={() => setLogoError(true)}
        />
      )}

      {/* Course title */}
      <h2 className="mt-4 text-lg font-bold leading-snug text-white sm:text-xl">
        Sensado y Modelado de Sistemas Físicos
      </h2>

      {/* Repository description */}
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
        Repositorio del curso de la UTB. Contiene notebooks, aplicaciones de
        escritorio y web para el análisis de fenómenos físicos.
      </p>
    </div>
  );
}
