/**
 * RestitutionVisual — decadencia exponencial de alturas de rebote.
 * Cada barra vertical representa la altura máxima de un rebote.
 * La envolvente exponencial h_n = h_0 · e^(2n·ln(e_coef)) se dibuja
 * encima como curva punteada. Es la firma visual del coeficiente e.
 */
interface Props { accent: string }

export default function RestitutionVisual({ accent }: Props) {
  const W = 200;
  const H = 120;
  const e = 0.72; // coeficiente de restitución ejemplo
  const h0 = H * 0.82;
  const nBounces = 7;
  const barW = 14;
  const gap = (W - nBounces * barW) / (nBounces + 1);

  const bounces = Array.from({ length: nBounces }, (_, i) => {
    const h = h0 * Math.pow(e * e, i);
    const x = gap + i * (barW + gap);
    return { x, h, y: H - h };
  });

  // Envelope curve through bar tops
  const envPoints = bounces.map(b => `${(b.x + barW / 2).toFixed(1)},${b.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="block w-full h-auto" aria-hidden="true">
      <defs>
        <linearGradient id="rest-bar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.7" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Floor line */}
      <line x1="0" y1={H} x2={W} y2={H}
        stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Bounce bars */}
      {bounces.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={barW} height={b.h}
          fill="url(#rest-bar)" rx="2" />
      ))}

      {/* Exponential envelope */}
      <polyline points={envPoints} fill="none"
        stroke={accent} strokeWidth="1.2" strokeDasharray="3 3"
        opacity="0.6" strokeLinecap="round" />

      {/* Dots at bar tops */}
      {bounces.map((b, i) => (
        <circle key={i} cx={b.x + barW / 2} cy={b.y} r="2"
          fill={accent} opacity="0.85" />
      ))}

      {/* e label */}
      <text x={W - 6} y="14" textAnchor="end"
        fontFamily="Newsreader, Georgia, serif" fontStyle="italic"
        fontSize="13" fill="rgba(255,255,255,0.55)">e</text>
    </svg>
  );
}
