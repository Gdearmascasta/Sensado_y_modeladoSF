/**
 * SatelliteVisual — imagen NDVI real de Sentinel-2.
 *
 * Dos modos:
 *   • hero=true  — panel grande (3×2): imagen cubre todo con object-cover,
 *                  overlays SVG absolutos encima.
 *   • hero=false — panel lateral estrecho (2×1): SVG con <image> y meet
 *                  para que la imagen se vea completa con margen.
 */
interface Props {
  accent: string;
  hero?: boolean;
}

const OVERLAYS = (W: number, H: number) => (
  <>
    <defs>
      <radialGradient id="sv-vignette" cx="50%" cy="50%" r="72%">
        <stop offset="40%" stopColor="transparent" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
      </radialGradient>
      <linearGradient id="sv-topbar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor="rgba(0,0,0,0.50)" />
        <stop offset="28%" stopColor="rgba(0,0,0,0.00)" />
      </linearGradient>
      <linearGradient id="sv-botbar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="68%" stopColor="rgba(0,0,0,0.00)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.60)" />
      </linearGradient>
    </defs>

    <rect x="0" y="0" width={W} height={H} fill="url(#sv-vignette)" />
    <rect x="0" y="0" width={W} height={H} fill="url(#sv-topbar)" />
    <rect x="0" y="0" width={W} height={H} fill="url(#sv-botbar)" />

    {/* Corner brackets */}
    <g stroke="rgba(255,255,255,0.65)" strokeWidth="1" fill="none" strokeLinecap="round">
      <path d={`M 8 18 L 8 10 L 16 10`} />
      <path d={`M ${W - 16} 10 L ${W - 8} 10 L ${W - 8} 18`} />
      <path d={`M 8 ${H - 18} L 8 ${H - 10} L 16 ${H - 10}`} />
      <path d={`M ${W - 16} ${H - 10} L ${W - 8} ${H - 10} L ${W - 8} ${H - 18}`} />
    </g>

    {/* Coordenada */}
    <text x="18" y="20" fontFamily="JetBrains Mono, monospace" fontSize="7"
      fill="rgba(255,255,255,0.72)" letterSpacing="0.5">
      10°25′N · 75°32′W
    </text>

    {/* Banda espectral RGB */}
    <g transform={`translate(${W - 42}, 10)`}>
      <rect x="0"  y="0" width="9"  height="12" rx="1" fill="#ef4444" opacity="0.88" />
      <rect x="11" y="0" width="9"  height="12" rx="1" fill="#22c55e" opacity="0.88" />
      <rect x="22" y="0" width="9"  height="12" rx="1" fill="#3b82f6" opacity="0.88" />
      <text x="15" y="22" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
        fontSize="6" fill="rgba(255,255,255,0.55)" letterSpacing="0.5">RGB</text>
    </g>

    {/* Leyenda */}
    <g transform={`translate(${W - 68}, ${H - 46})`}>
      <rect x="-5" y="-5" width="66" height="42" rx="3"
        fill="rgba(3,3,8,0.68)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
      {[
        { color: '#4ade80', label: 'Vegetación' },
        { color: '#f87171', label: 'Río / Agua' },
        { color: '#fbbf24', label: 'Minería' },
      ].map((item, i) => (
        <g key={i} transform={`translate(0, ${i * 11})`}>
          <rect x="0" y="0" width="7" height="7" rx="1" fill={item.color} />
          <text x="11" y="6.5" fontFamily="JetBrains Mono, monospace"
            fontSize="7" fill="rgba(255,255,255,0.82)" letterSpacing="0.3">
            {item.label}
          </text>
        </g>
      ))}
    </g>

    {/* Label NDVI */}
    <text x="12" y={H - 10} fontFamily="JetBrains Mono, monospace" fontSize="7"
      fill="rgba(255,255,255,0.55)" letterSpacing="1">
      NDVI · Sentinel-2
    </text>
  </>
);

export default function SatelliteVisual({ hero = false }: Props) {
  /* ── HERO mode: imagen cubre todo el panel, SVG overlay encima ── */
  if (hero) {
    return (
      <div className="absolute inset-0">
        <img
          src="/imgs/mapa_clasificacion_mineria.png"
          alt="Mapa NDVI Sentinel-2"
          className="h-full w-full object-cover object-center"
          draggable={false}
        />
        <svg
          viewBox="0 0 600 320"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {OVERLAYS(600, 320)}
        </svg>
      </div>
    );
  }

  /* ── WIDE mode: SVG con <image> meet, imagen completa con margen ── */
  return (
    <svg
      viewBox="0 0 200 120"
      preserveAspectRatio="xMidYMid meet"
      className="block w-full h-auto"
      aria-hidden="true"
    >
      <image
        href="/imgs/mapa_clasificacion_mineria.png"
        x="6" y="4"
        width="188"
        height="112"
        preserveAspectRatio="xMidYMid meet"
      />
      {/* Overlays ajustados al área de la imagen */}
      <defs>
        <radialGradient id="sv-vignette-w" cx="50%" cy="50%" r="72%">
          <stop offset="40%" stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.65)" />
        </radialGradient>
        <linearGradient id="sv-topbar-w" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="rgba(0,0,0,0.48)" />
          <stop offset="28%" stopColor="rgba(0,0,0,0.00)" />
        </linearGradient>
        <linearGradient id="sv-botbar-w" x1="0" y1="0" x2="0" y2="1">
          <stop offset="68%" stopColor="rgba(0,0,0,0.00)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.58)" />
        </linearGradient>
      </defs>
      <rect x="6" y="4" width="188" height="112" fill="url(#sv-vignette-w)" rx="3" />
      <rect x="6" y="4" width="188" height="112" fill="url(#sv-topbar-w)"   rx="3" />
      <rect x="6" y="4" width="188" height="112" fill="url(#sv-botbar-w)"   rx="3" />

      {/* Corner brackets */}
      <g stroke="rgba(255,255,255,0.65)" strokeWidth="0.9" fill="none" strokeLinecap="round">
        <path d="M 10 14 L 10 8 L 16 8" />
        <path d="M 184 8 L 190 8 L 190 14" />
        <path d="M 10 108 L 10 114 L 16 114" />
        <path d="M 184 114 L 190 114 L 190 108" />
      </g>

      {/* Coordenada */}
      <text x="16" y="15" fontFamily="JetBrains Mono, monospace" fontSize="5"
        fill="rgba(255,255,255,0.72)" letterSpacing="0.4">
        10°25′N · 75°32′W
      </text>

      {/* Banda RGB */}
      <g transform="translate(166, 8)">
        <rect x="0"  y="0" width="6" height="8" rx="0.5" fill="#ef4444" opacity="0.88" />
        <rect x="7"  y="0" width="6" height="8" rx="0.5" fill="#22c55e" opacity="0.88" />
        <rect x="14" y="0" width="6" height="8" rx="0.5" fill="#3b82f6" opacity="0.88" />
        <text x="10" y="16" textAnchor="middle" fontFamily="JetBrains Mono, monospace"
          fontSize="4.5" fill="rgba(255,255,255,0.55)" letterSpacing="0.3">RGB</text>
      </g>

      {/* Leyenda */}
      <g transform="translate(148, 84)">
        <rect x="-3" y="-3" width="48" height="30" rx="2"
          fill="rgba(3,3,8,0.65)" stroke="rgba(255,255,255,0.13)" strokeWidth="0.4" />
        {[
          { color: '#4ade80', label: 'VEG' },
          { color: '#f87171', label: 'RÍO' },
          { color: '#fbbf24', label: 'MIN' },
        ].map((item, i) => (
          <g key={i} transform={`translate(0, ${i * 8})`}>
            <rect x="0" y="0" width="5.5" height="5.5" rx="0.7" fill={item.color} />
            <text x="8" y="5" fontFamily="JetBrains Mono, monospace"
              fontSize="5.5" fill="rgba(255,255,255,0.82)" letterSpacing="0.3">
              {item.label}
            </text>
          </g>
        ))}
      </g>

      {/* Label NDVI */}
      <text x="11" y="113" fontFamily="JetBrains Mono, monospace" fontSize="5"
        fill="rgba(255,255,255,0.55)" letterSpacing="0.7">
        NDVI · Sentinel-2
      </text>
    </svg>
  );
}
