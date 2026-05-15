/**
 * GravityTrackerVisual — trayectoria de video tracking.
 * Muestra una serie de puntos de posición detectados frame a frame
 * (la trayectoria real del objeto en caída) con la curva ajustada encima.
 * Incluye una línea de "calibración" px→m en la esquina.
 */
interface Props { accent: string }

export default function GravityTrackerVisual({ accent }: Props) {
  const W = 280;
  const H = 140;

  // Simulated tracked positions: parabola + realistic jitter
  const jitter = [1.2, -2.1, 0.8, -1.5, 2.3, -0.9, 1.7, -2.4, 0.6, -1.8,
                  2.0, -1.2, 0.9, -2.0, 1.4, -0.7, 1.9, -1.6, 0.5, -2.2];
  const nFrames = 20;
  const k = H * 0.78;
  const tracked = Array.from({ length: nFrames }, (_, i) => {
    const t = (i + 1) / nFrames;
    return {
      x: t * W * 0.92 + 8,
      y: H * 0.08 + k * t * t + jitter[i],
    };
  });

  // Smooth fitted curve
  const N = 100;
  const curvePoints: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * W * 0.92 + 8;
    const y = H * 0.08 + k * t * t;
    curvePoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="block w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="tracker-fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="tracker-line" x1="0" x2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Filled area under curve */}
      <polyline
        points={[...curvePoints, `${W * 0.92 + 8},${H}`, `8,${H}`].join(' ')}
        fill="url(#tracker-fade)" stroke="none" />

      {/* Fitted curve */}
      <polyline points={curvePoints.join(' ')} fill="none"
        stroke="url(#tracker-line)" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Tracked frame dots */}
      {tracked.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2"
          fill={accent} opacity="0.55" />
      ))}

      {/* Calibration scale bar (bottom-left) */}
      <g opacity="0.45">
        <line x1="8" y1={H - 8} x2="38" y2={H - 8}
          stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="8" y1={H - 5} x2="8" y2={H - 11}
          stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <line x1="38" y1={H - 5} x2="38" y2={H - 11}
          stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <text x="23" y={H - 13} textAnchor="middle"
          fontFamily="JetBrains Mono, monospace" fontSize="8"
          fill="rgba(255,255,255,0.45)">0.5 m</text>
      </g>
    </svg>
  );
}
