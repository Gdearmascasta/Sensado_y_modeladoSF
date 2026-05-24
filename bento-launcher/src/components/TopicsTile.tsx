/**
 * TopicsTile — sidebar vertical (1×2) con las temáticas del curso.
 *
 * Cada temática tiene label, descripción corta y keyword técnica,
 * aprovechando el espacio vertical del tile 1×2.
 */

interface Topic {
  label: string;
  desc: string;
  keyword: string;
  dot: string;
  highlight?: boolean;
}

const TOPICS: Topic[] = [
  {
    label: 'Visión Computacional',
    desc: 'Tracking de objetos frame a frame con OpenCV',
    keyword: 'OpenCV · px→m',
    dot: '#10b981',
    highlight: true,
  },
  {
    label: 'Ajuste de Curvas',
    desc: 'Regresión no lineal sobre datos experimentales',
    keyword: 'scipy.curve_fit',
    dot: '#06b6d4',
  },
  {
    label: 'FFT',
    desc: 'Frecuencia dominante de señales oscilatorias',
    keyword: 'numpy.fft',
    dot: '#8b5cf6',
  },
  {
    label: 'Cinemática',
    desc: 'Modelos de caída libre y rebote elástico',
    keyword: 'y = ½ g t²',
    dot: '#3b82f6',
  },
  {
    label: 'Sensado Remoto',
    desc: 'Clasificación de cobertura con Sentinel-2',
    keyword: 'NDVI · Random Forest',
    dot: '#f59e0b',
  },
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

      {/* Decorative glows */}
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-[60px]" />
      <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-cyan-500/5 blur-[50px]" />

      {/* Header */}
      <div className="relative z-10 flex-shrink-0">
        <p className="font-mono-tech text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          Temáticas · {TOPICS.length} módulos
        </p>
        <h3
          className="mt-1.5 text-base font-bold leading-tight tracking-tight text-white"
          style={{ letterSpacing: '-0.02em' }}
        >
          Análisis físico,{' '}
          <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            datos en acción.
          </span>
        </h3>
      </div>

      {/* Divider */}
      <div className="relative z-10 mt-3 h-px w-full flex-shrink-0 bg-gradient-to-r from-white/[0.06] via-white/[0.10] to-transparent" />

      {/* Topic cards — flex-1 para ocupar todo el espacio restante */}
      <div className="relative z-10 mt-3 flex flex-1 flex-col gap-2 overflow-hidden">
        {TOPICS.map((t) => (
          <div
            key={t.label}
            className={`
              flex flex-1 flex-col justify-center rounded-xl border px-3 py-0 backdrop-blur-md transition-colors duration-300
              ${
                t.highlight
                  ? 'border-emerald-400/25 bg-emerald-400/[0.07] shadow-[0_0_18px_-6px_rgba(16,185,129,0.30)]'
                  : 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]'
              }
            `}
          >
            {/* Label + dot */}
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{
                  backgroundColor: t.dot,
                  boxShadow: t.highlight ? `0 0 8px ${t.dot}` : 'none',
                }}
              />
              <span
                className={`text-[12px] font-semibold tracking-tight ${
                  t.highlight ? 'text-emerald-100' : 'text-zinc-300'
                }`}
              >
                {t.label}
              </span>
            </div>

            {/* Description */}
            <p className="mt-0.5 pl-[14px] text-[10.5px] leading-snug text-zinc-500">
              {t.desc}
            </p>

            {/* Keyword badge */}
            <div className="mt-1 pl-[14px]">
              <span
                className="font-mono-tech inline-block rounded-md px-1.5 py-0.5 text-[9px] tracking-wide"
                style={{
                  backgroundColor: `${t.dot}18`,
                  color: t.dot,
                  border: `0.5px solid ${t.dot}35`,
                }}
              >
                {t.keyword}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
