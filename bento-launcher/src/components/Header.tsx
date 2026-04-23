import { useState } from 'react';

export default function Header() {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="px-6 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl flex items-center gap-5">
        {/* UTB Logo with fallback */}
        <div className="flex-shrink-0">
          {logoError ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-card text-lg font-bold text-primary">
              UTB
            </div>
          ) : (
            <img
              src="/logos/utb-logo.png"
              alt="Logo UTB"
              className="h-14 w-14 rounded-lg object-contain"
              onError={() => setLogoError(true)}
            />
          )}
        </div>

        {/* Title and description */}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sensado y Modelado de Sistemas Físicos
          </h1>
          <p className="mt-1 text-sm text-zinc-400 sm:text-base">
            Hub central del repositorio — notebooks, aplicaciones y herramientas del curso de la UTB.
          </p>
        </div>
      </div>
    </header>
  );
}
