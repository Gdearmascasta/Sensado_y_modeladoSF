/**
 * TopicsTile — sidebar vertical (1×2) con las temáticas del curso.
 *
 * Acompaña al hero block (Gravity 3×2) ocupando el 1/4 restante de la fila.
 * Las pills se apilan verticalmente, aprovechando el formato angosto y
 * alto.
 */

const TOPICS: { label: string; highlight?: boolean }[] = [
  { label: 'Visión Computacional', highlight: true },
  { label: 'Ajuste de Curvas' },
  { label: 'FFT' },
  { label: 'Cinemática' },
  { label: 'Sensado Remoto' },
];

export default function TopicsTile() {
  return (
    <div
      className="
        noise-overlay relative h-full overflow-hidden rounded-3xl glass-card glow-emerald
        flex flex-col
        p-6
      "
      aria-label="Temáticas del curso"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-[60px]" />

      <p className="relative z-10 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">
        Temáticas
      </p>

      <h3
        className="relative z-10 mt-2 text-base font-bold leading-tight tracking-tight text-white"
        style={{ letterSpacing: '-0.02em' }}
      >
        Análisis físico,<br />
        <span className="text-emerald-300/90">datos en acción.</span>
      </h3>

      {/* Vertical pill stack */}
      <div className="relative z-10 mt-5 flex flex-col gap-2">
        {TOPICS.map((t) => (
          <span
            key={t.label}
            className={`
              inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[12px] font-medium tracking-tight backdrop-blur-md
              ${
                t.highlight
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100 shadow-[0_0_20px_-6px_rgba(16,185,129,0.4)]'
                  : 'border-white/10 bg-white/[0.04] text-zinc-300'
              }
            `}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
