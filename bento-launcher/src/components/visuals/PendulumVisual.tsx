/**
 * PendulumVisual — viñeta SVG editorial para la app de Péndulo Simple.
 *
 * Muestra una onda senoidal amortiguada (la señal real que registra la app
 * tras el tracking del bob) con el período T anotado entre dos crestas y
 * la línea de equilibrio θ=0 punteada. La estética es "página de paper":
 * mucho aire, finas líneas, una sola anotación.
 */
interface Props {
  accent: string;
}

export default function PendulumVisual({ accent }: Props) {
  // Sample a damped sine across the viewBox.
  // y(t) = A · e^(-γt) · cos(ω t)
  const W = 320;
  const H = 120;
  const cy = H / 2;
  const A = 38;          // initial amplitude
  const gamma = 0.55;    // damping
  const omega = 2 * Math.PI * 1.6; // 1.6 cycles across the box
  const N = 200;
  const points: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * W;
    const y = cy - A * Math.exp(-gamma * t) * Math.cos(omega * t);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const polylinePoints = points.join(' ');

  // First two crests (max points) — used to mark the period T.
  // For y = A·e^(-γt)·cos(ωt), local maxima of |cos| approximately at t = n·π/ω.
  // We mark t1=0 and t2=2π/ω in normalized t.
  const t1 = 0;
  const t2 = (2 * Math.PI) / omega; // first full period in our normalized timeline
  const x1 = t1 * W;
  const x2 = Math.min(t2 * W, W - 4);
  const y1 = cy - A * Math.exp(-gamma * t1) * Math.cos(omega * t1);
  const y2 = cy - A * Math.exp(-gamma * t2) * Math.cos(omega * t2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block w-full h-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pendulum-fade" x1="0" x2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Equilibrium line θ = 0 */}
      <line
        x1="0" y1={cy} x2={W} y2={cy}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
        strokeDasharray="2 4"
      />

      {/* The damped sine itself */}
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="url(#pendulum-fade)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Crest dots */}
      <circle cx={x1} cy={y1} r="2.5" fill={accent} />
      <circle cx={x2} cy={y2} r="2.5" fill={accent} />

      {/* Period bracket: small tick marks + horizontal bar between the two crests */}
      <g stroke="rgba(255,255,255,0.4)" strokeWidth="1">
        <line x1={x1} y1={y1 - 8} x2={x1} y2={y1 - 14} />
        <line x1={x2} y1={y2 - 8} x2={x2} y2={y2 - 14} />
        <line x1={x1} y1={y1 - 11} x2={x2} y2={y2 - 11} />
      </g>

      {/* T label — italic serif, small, hanging above the bracket */}
      <text
        x={(x1 + x2) / 2}
        y={Math.min(y1, y2) - 18}
        textAnchor="middle"
        fontStyle="italic"
        fontFamily="Newsreader, Georgia, serif"
        fontSize="12"
        fill="rgba(255,255,255,0.75)"
      >
        T
      </text>
    </svg>
  );
}
