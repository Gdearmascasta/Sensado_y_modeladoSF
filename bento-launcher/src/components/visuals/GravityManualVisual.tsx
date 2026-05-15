/**
 * GravityManualVisual — parábola y = ½gt² con puntos experimentales.
 * Representa la caída libre medida manualmente: puntos dispersos (datos
 * reales con error) y la curva ajustada encima.
 */
interface Props { accent: string }

export default function GravityManualVisual({ accent }: Props) {
  const W = 200;
  const H = 120;

  // Parabola: y_px = k * t² mapped to SVG coords (y grows downward)
  // We show t from 0 to 1 (normalized), y from 0 to H*0.85
  const k = H * 0.85;
  const N = 80;
  const curvePoints: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * W;
    const y = H - k * t * t;
    curvePoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // Experimental scatter points (slightly noisy parabola)
  const noise = [0.02, -0.03, 0.015, -0.025, 0.01, -0.02, 0.03, -0.01, 0.025, -0.015];
  const scatterTs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  const scatter = scatterTs.map((t, i) => ({
    x: t * W,
    y: H - k * (t + noise[i]) * (t + noise[i]),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="block w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="grav-fade" x1="0" x2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Axis lines */}
      <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="0" y1="0" x2="0" y2={H} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* Fitted parabola */}
      <polyline points={curvePoints.join(' ')} fill="none"
        stroke="url(#grav-fade)" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Experimental scatter */}
      {scatter.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.2"
          fill="none" stroke={accent} strokeWidth="1.2" opacity="0.7" />
      ))}

      {/* Axis labels */}
      <text x="4" y={H - 4} fontFamily="JetBrains Mono, monospace"
        fontSize="9" fill="rgba(255,255,255,0.3)">t</text>
      <text x="4" y="10" fontFamily="JetBrains Mono, monospace"
        fontSize="9" fill="rgba(255,255,255,0.3)">y</text>
    </svg>
  );
}
