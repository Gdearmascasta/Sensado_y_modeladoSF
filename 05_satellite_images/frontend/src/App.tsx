import { useState } from 'react';
import { Search, Layers, BarChart2, Cpu, Map, ChevronRight, Satellite } from 'lucide-react';
import type { SearchResponse, StreamLine } from './types';
import SearchPanel from './components/SearchPanel';
import BandsPanel from './components/BandsPanel';
import IndicesPanel from './components/IndicesPanel';
import ClassifierPanel from './components/ClassifierPanel';
import MapPanel from './components/MapPanel';

// ── Types ──────────────────────────────────────────────────────────────────────

type AppStep = 1 | 2 | 3 | 4 | 5;

interface AppState {
  step: AppStep;
  sessionId: string | null;
  sceneInfo: { id: string; datetime: string; cloudCover: number } | null;
  streamLogs: StreamLine[];
  errorMsg: string;
  loading: boolean;
}

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1 as AppStep, label: 'Búsqueda',   icon: Search   },
  { id: 2 as AppStep, label: 'Bandas',     icon: Layers   },
  { id: 3 as AppStep, label: 'Índices',    icon: BarChart2 },
  { id: 4 as AppStep, label: 'Clasificar', icon: Cpu      },
  { id: 5 as AppStep, label: 'Mapa',       icon: Map      },
];

// ── App ────────────────────────────────────────────────────────────────────────

function App() {
  const [state, setState] = useState<AppState>({
    step: 1,
    sessionId: null,
    sceneInfo: null,
    streamLogs: [],
    errorMsg: '',
    loading: false,
  });

  const setStep = (step: AppStep) => setState(prev => ({ ...prev, step }));

  const handleReset = () => {
    setState({
      step: 1,
      sessionId: null,
      sceneInfo: null,
      streamLogs: [],
      errorMsg: '',
      loading: false,
    });
  };

  // A step is accessible if it has been reached (sessionId unlocks steps 2+)
  const isStepAccessible = (stepId: AppStep): boolean => {
    if (stepId === 1) return true;
    return state.sessionId !== null;
  };

  const handleSearchComplete = (response: SearchResponse) => {
    setState(prev => ({
      ...prev,
      sessionId: response.session_id,
      sceneInfo: {
        id: response.scene_id,
        datetime: response.datetime,
        cloudCover: response.cloud_cover,
      },
      step: 2,
    }));
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* ── Header ── */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <Satellite className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight accent-gradient-text">
              Imágenes Satelitales
            </h1>
            <p className="text-zinc-500 font-medium">
              Clasificación de cobertura terrestre con Sentinel-2 y Random Forest
            </p>
          </div>
        </div>

        {/* ── Stepper nav ── */}
        <nav className="flex items-center gap-2 bg-zinc-900/40 p-2 rounded-2xl border border-white/5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => isStepAccessible(s.id) && setStep(s.id)}
                disabled={!isStepAccessible(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  state.step === s.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : isStepAccessible(s.id)
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 cursor-pointer'
                    : 'text-zinc-700 cursor-not-allowed'
                }`}
              >
                <s.icon className="w-4 h-4" />
                <span className="text-sm font-semibold hidden lg:block">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-zinc-700 mx-1 hidden lg:block" />
              )}
            </div>
          ))}
        </nav>
      </header>

      {/* ── Main panels ── */}
      <main className="max-w-7xl mx-auto">

        {/* Step 1 — Búsqueda */}
        {state.step === 1 && (
          <div className="glass-panel p-8 md:p-12 animate-fade-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 border border-emerald-500/20">
                <Search className="w-9 h-9 text-emerald-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Configurar Consulta STAC</h2>
              <p className="text-zinc-400 max-w-sm text-center leading-relaxed text-sm">
                Define la zona de interés, el rango temporal y el umbral de nubes para buscar
                la mejor escena Sentinel-2 disponible.
              </p>
            </div>
            <SearchPanel onSearchComplete={handleSearchComplete} />
          </div>
        )}

        {/* Step 2 — Bandas */}
        {state.step === 2 && state.sessionId && state.sceneInfo && (
          <div className="glass-panel p-8 md:p-12 animate-fade-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 border border-blue-500/20">
                <Layers className="w-9 h-9 text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Descarga de Bandas</h2>
              <p className="text-zinc-400 max-w-sm text-center leading-relaxed text-sm">
                Descarga las bandas B02, B03, B04, B08 y B11 de la escena seleccionada y
                genera la vista en color real.
              </p>
            </div>
            <BandsPanel
              sessionId={state.sessionId}
              sceneInfo={state.sceneInfo}
              onComplete={() => setStep(3)}
            />
          </div>
        )}

        {/* Step 3 — Índices */}
        {state.step === 3 && state.sessionId && state.sceneInfo && (
          <div className="glass-panel p-8 md:p-12 animate-fade-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-3xl flex items-center justify-center mb-6 border border-yellow-500/20">
                <BarChart2 className="w-9 h-9 text-yellow-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Índices Espectrales</h2>
              <p className="text-zinc-400 max-w-sm text-center leading-relaxed text-sm">
                Visualiza los índices NDVI, BSI y NDWI para interpretar la vegetación,
                el suelo expuesto y el agua.
              </p>
            </div>
            <IndicesPanel
              sessionId={state.sessionId}
              sceneInfo={state.sceneInfo}
              onComplete={() => setStep(4)}
            />
          </div>
        )}

        {/* Step 4 — Clasificar */}
        {state.step === 4 && state.sessionId && (
          <div className="glass-panel p-8 md:p-12 animate-fade-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-6 border border-purple-500/20">
                <Cpu className="w-9 h-9 text-purple-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Entrenamiento del Clasificador</h2>
              <p className="text-zinc-400 max-w-sm text-center leading-relaxed text-sm">
                Ajusta los umbrales de pseudo-etiquetado y entrena el modelo Random Forest
                para clasificar la cobertura terrestre.
              </p>
            </div>
            <ClassifierPanel
              sessionId={state.sessionId}
              onComplete={() => setStep(5)}
            />
          </div>
        )}

        {/* Step 5 — Mapa */}
        {state.step === 5 && state.sessionId && (
          <div className="glass-panel p-8 md:p-12 animate-fade-in">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 bg-teal-500/10 rounded-3xl flex items-center justify-center mb-6 border border-teal-500/20">
                <Map className="w-9 h-9 text-teal-500" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Mapa Clasificado</h2>
              <p className="text-zinc-400 max-w-sm text-center leading-relaxed text-sm">
                Visualiza y exporta el mapa de clasificación con las clases Vegetación,
                Agua, Minería/Suelo expuesto y No clasificado.
              </p>
            </div>
            <MapPanel
              sessionId={state.sessionId}
              onReset={handleReset}
            />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
