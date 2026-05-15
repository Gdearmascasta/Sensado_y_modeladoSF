/**
 * SatelliteVisual — mini-mapa de clasificación de cobertura terrestre.
 * Una grilla de píxeles con los colores de las 3 clases del clasificador:
 *   verde  → vegetación  (NDVI alto)
 *   azul   → agua        (NDWI alto)
 *   arena  → minería/suelo desnudo (BSI alto)
 * Simula la salida del Random Forest sobre la escena Sentinel-2.
 */
interface Props { accent: string }

// Deterministic pseudo-random using a simple LCG seeded by position
function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff;
}

export default function SatelliteVisual({ accent }: Props) {
  const W = 200;
  const H = 120;
  const cols = 20;
  const rows = 12;
  const pw = W / cols;
  const ph = H / rows;

  // Class color palette (matches the app's classifier output)
  const classes = [
    { color: '#22c55e', weight: 0.45 }, // vegetation
    { color: '#3b82f6', weight: 0.20 }, // water
    { color: '#d97706', weight: 0.25 }, // mining/bare soil
    { color: '#1c1917', weight: 0.10 }, // shadow/unclassified
  ];

  const pixels: { x: number; y: number; color: string }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const seed = r * cols + c;
      const rnd = Math.abs(lcg(seed));
      let cumulative = 0;
      let color = classes[0].color;
      for (const cls of classes) {
        cumulative += cls.weight;
        if (rnd < cumulative) { color = cls.color; break; }
      }
      pixels.push({ x: c * pw, y: r * ph, color });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="block w-full h-auto" aria-hidden="true">
      <defs>
        {/* Vignette overlay to give depth */}
        <radialGradient id="sat-vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
      </defs>

      {/* Pixel grid */}
      {pixels.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={pw + 0.5} height={ph + 0.5}
          fill={p.color} opacity="0.82" />
      ))}

      {/* Vignette */}
      <rect x="0" y="0" width={W} height={H} fill="url(#sat-vignette)" />

      {/* Scan-line overlay for "satellite imagery" feel */}
      {Array.from({ length: rows }, (_, r) => (
        <line key={r} x1="0" y1={r * ph} x2={W} y2={r * ph}
          stroke="rgba(0,0,0,0.18)" strokeWidth="0.4" />
      ))}

      {/* Legend pills — bottom right */}
      <g transform={`translate(${W - 58}, ${H - 38})`}>
        {[
          { color: '#22c55e', label: 'VEG' },
          { color: '#3b82f6', label: 'H₂O' },
          { color: '#d97706', label: 'MIN' },
        ].map((item, i) => (
          <g key={i} transform={`translate(0, ${i * 12})`}>
            <rect x="0" y="-7" width="7" height="7" rx="1" fill={item.color} opacity="0.9" />
            <text x="10" y="0" fontFamily="JetBrains Mono, monospace"
              fontSize="7" fill="rgba(255,255,255,0.65)">{item.label}</text>
          </g>
        ))}
      </g>

      {/* Accent border */}
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1}
        fill="none" stroke={accent} strokeWidth="1" opacity="0.3" rx="2" />
    </svg>
  );
}
