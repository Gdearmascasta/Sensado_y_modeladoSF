import { useState } from 'react';
import { BarChart2, Leaf, Mountain, Droplets, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = '';

// ── Types ──────────────────────────────────────────────────────────────────────

type IndexName = 'ndvi' | 'bsi' | 'ndwi';

interface IndicesPanelProps {
  sessionId: string;
  sceneInfo: { id: string; datetime: string; cloudCover: number };
  onComplete: () => void;
}

// ── Index metadata ─────────────────────────────────────────────────────────────

const INDICES: {
  name: IndexName;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  activeClass: string;
}[] = [
  {
    name: 'ndvi',
    label: 'NDVI',
    description: 'Índice de Vegetación de Diferencia Normalizada',
    icon: Leaf,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    activeClass: 'bg-emerald-600 text-white shadow-emerald-600/20',
  },
  {
    name: 'bsi',
    label: 'BSI',
    description: 'Índice de Suelo Desnudo',
    icon: Mountain,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    activeClass: 'bg-amber-600 text-white shadow-amber-600/20',
  },
  {
    name: 'ndwi',
    label: 'NDWI',
    description: 'Índice de Agua de Diferencia Normalizada',
    icon: Droplets,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    activeClass: 'bg-blue-600 text-white shadow-blue-600/20',
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function IndicesPanel({ sessionId, sceneInfo, onComplete }: IndicesPanelProps) {
  const [activeIndex, setActiveIndex] = useState<IndexName>('ndvi');
  const [indexLoadError, setIndexLoadError] = useState<string | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [trueColorError, setTrueColorError] = useState<string | null>(null);

  // Build image URLs with cache-busting per session
  const trueColorUrl = `${API_BASE}/preview/truecolor?session_id=${sessionId}`;
  const indexUrl = `${API_BASE}/index/${activeIndex}?session_id=${sessionId}`;

  const handleSelectIndex = (name: IndexName) => {
    if (name === activeIndex) return;
    setActiveIndex(name);
    setIndexLoadError(null);
    setIndexLoading(true);
  };

  const activeIndexMeta = INDICES.find(i => i.name === activeIndex)!;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6">

      {/* ── Scene info strip ── */}
      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 px-6 py-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Escena</span>
        </div>
        <div className="flex flex-wrap gap-6 text-xs font-mono">
          <span className="text-zinc-500">
            ID: <span className="text-zinc-300">{sceneInfo.id.slice(0, 30)}…</span>
          </span>
          <span className="text-zinc-500">
            Fecha: <span className="text-zinc-300">{sceneInfo.datetime.slice(0, 10)}</span>
          </span>
          <span className="text-zinc-500">
            Nubes: <span className="text-yellow-400 font-bold">{sceneInfo.cloudCover.toFixed(1)} %</span>
          </span>
        </div>
      </div>

      {/* ── Index selector buttons ── */}
      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-6">
        <h3 className="text-sm font-bold text-zinc-300 mb-4">Seleccionar índice espectral</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {INDICES.map(idx => {
            const Icon = idx.icon;
            const isActive = activeIndex === idx.name;
            return (
              <button
                key={idx.name}
                onClick={() => handleSelectIndex(idx.name)}
                className={`flex items-center gap-3 px-5 py-4 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98] border ${
                  isActive
                    ? `${idx.activeClass} border-transparent shadow-lg`
                    : `${idx.bgColor} ${idx.borderColor} ${idx.color} hover:brightness-110`
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-bold">{idx.label}</div>
                  <div className={`text-[10px] font-normal leading-tight ${isActive ? 'text-white/70' : 'text-zinc-500'}`}>
                    {idx.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Side-by-side image panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* True Color — always visible */}
        <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Color Real</h3>
              <p className="text-xs text-zinc-500">B04 / B03 / B02 — referencia visual</p>
            </div>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center min-h-[280px]">
            {trueColorError ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-red-400 font-medium">{trueColorError}</p>
              </div>
            ) : (
              <img
                src={trueColorUrl}
                alt="Vista en color real de la escena Sentinel-2"
                className="w-full h-full object-contain max-h-[480px]"
                onError={() => setTrueColorError('No se pudo cargar la imagen de color real.')}
              />
            )}
          </div>
        </div>

        {/* Selected index */}
        <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 ${activeIndexMeta.bgColor} rounded-lg border ${activeIndexMeta.borderColor}`}>
              <activeIndexMeta.icon className={`w-4 h-4 ${activeIndexMeta.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">{activeIndexMeta.label}</h3>
              <p className="text-xs text-zinc-500">{activeIndexMeta.description}</p>
            </div>
          </div>

          <div className="flex-1 rounded-xl overflow-hidden border border-white/5 bg-black/40 flex items-center justify-center min-h-[280px] relative">
            {/* Loading overlay */}
            {indexLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 rounded-xl">
                <Loader2 className={`w-8 h-8 animate-spin ${activeIndexMeta.color}`} />
              </div>
            )}

            {indexLoadError ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-sm text-red-400 font-medium">{indexLoadError}</p>
              </div>
            ) : (
              <img
                key={`${activeIndex}-${sessionId}`}
                src={indexUrl}
                alt={`Índice ${activeIndexMeta.label} con colormap y barra de escala`}
                className="w-full h-full object-contain max-h-[480px]"
                onLoad={() => setIndexLoading(false)}
                onError={() => {
                  setIndexLoading(false);
                  setIndexLoadError(`No se pudo cargar el índice ${activeIndexMeta.label}.`);
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Index description card ── */}
      <div className={`${activeIndexMeta.bgColor} border ${activeIndexMeta.borderColor} rounded-2xl px-6 py-4`}>
        <div className="flex items-start gap-3">
          <activeIndexMeta.icon className={`w-5 h-5 ${activeIndexMeta.color} flex-shrink-0 mt-0.5`} />
          <div>
            <p className={`text-sm font-bold ${activeIndexMeta.color} mb-1`}>{activeIndexMeta.label} — {activeIndexMeta.description}</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {activeIndex === 'ndvi' && 'NDVI = (B08 − B04) / (B08 + B04). Valores altos (verde) indican vegetación densa; valores bajos (rojo) indican suelo desnudo o agua.'}
              {activeIndex === 'bsi' && 'BSI = ((B11 + B04) − (B08 + B02)) / ((B11 + B04) + (B08 + B02)). Valores altos indican suelo expuesto o zonas de minería.'}
              {activeIndex === 'ndwi' && 'NDWI = (B03 − B08) / (B03 + B08). Valores altos (azul) indican presencia de agua superficial.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Continue button ── */}
      <button
        onClick={onComplete}
        className="w-full py-4 rounded-2xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3 bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-600/20 active:scale-[0.98]"
      >
        Continuar a Clasificador
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
