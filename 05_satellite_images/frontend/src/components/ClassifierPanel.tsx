import { useState, useCallback } from 'react';
import {
  Cpu,
  Eye,
  Play,
  Map,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Leaf,
  Droplets,
  Mountain,
  ChevronRight,
} from 'lucide-react';
import type { StreamLine, ThresholdPreviewResponse } from '../types';
import { useProgressStream } from '../hooks/useProgressStream';
import ProgressBar from './ProgressBar';
import LogConsole from './LogConsole';

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = '';

const DEFAULT_THRESHOLDS = {
  ndvi_veg_min:    0.60,
  bsi_veg_max:    -0.10,
  ndwi_water_min:  0.10,
  ndvi_water_max:  0.10,
  bsi_mining_min:  0.12,
  ndvi_mining_max: 0.25,
};

// ── Types ──────────────────────────────────────────────────────────────────────

type ThresholdKey = keyof typeof DEFAULT_THRESHOLDS;

type WorkflowStep = 'preview' | 'train' | 'predict';
type StepStatus   = 'idle' | 'running' | 'done' | 'error';

interface ClassifierPanelProps {
  sessionId: string;
  onComplete: () => void;
}

interface ThresholdField {
  key: ThresholdKey;
  label: string;
  description: string;
}

const THRESHOLD_FIELDS: ThresholdField[] = [
  { key: 'ndvi_veg_min',    label: 'NDVI veg. mín.',    description: 'Vegetación: NDVI ≥ este valor' },
  { key: 'bsi_veg_max',     label: 'BSI veg. máx.',     description: 'Vegetación: BSI ≤ este valor' },
  { key: 'ndwi_water_min',  label: 'NDWI agua mín.',    description: 'Agua: NDWI ≥ este valor' },
  { key: 'ndvi_water_max',  label: 'NDVI agua máx.',    description: 'Agua: NDVI ≤ este valor' },
  { key: 'bsi_mining_min',  label: 'BSI minería mín.',  description: 'Minería: BSI ≥ este valor' },
  { key: 'ndvi_mining_max', label: 'NDVI minería máx.', description: 'Minería: NDVI ≤ este valor' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseThreshold(raw: string): number | null {
  const n = parseFloat(raw);
  if (isNaN(n)) return null;
  if (n < -1.0 || n > 1.0) return null;
  return n;
}

function formatThreshold(n: number): string {
  return n.toFixed(2);
}

/** Map HTTP status codes to user-friendly messages */
function httpErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Umbrales inválidos: verifica que todos los valores estén en el rango [-1.0, 1.0].';
    case 404: return 'Sesión no encontrada o expirada. Vuelve al paso 1 para iniciar una nueva búsqueda.';
    case 409: return 'El clasificador no ha sido entrenado. Entrena el modelo antes de predecir.';
    case 422: return 'Ninguna clase obtuvo píxeles con estos umbrales. Amplía los rangos e intenta de nuevo.';
    default:  return `Error del servidor (HTTP ${status}). Intenta de nuevo.`;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ClassifierPanel({ sessionId, onComplete }: ClassifierPanelProps) {
  // ── Threshold inputs ─────────────────────────────────────────────────────────
  const [rawValues, setRawValues] = useState<Record<ThresholdKey, string>>(() =>
    Object.fromEntries(
      Object.entries(DEFAULT_THRESHOLDS).map(([k, v]) => [k, formatThreshold(v)])
    ) as Record<ThresholdKey, string>
  );
  const [inputErrors, setInputErrors] = useState<Partial<Record<ThresholdKey, string>>>({});

  // ── Preview state ─────────────────────────────────────────────────────────────
  const [previewStatus, setPreviewStatus] = useState<StepStatus>('idle');
  const [previewResult, setPreviewResult] = useState<ThresholdPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ── Train state ───────────────────────────────────────────────────────────────
  const [trainStatus, setTrainStatus] = useState<StepStatus>('idle');
  const [trainProgress, setTrainProgress] = useState(0);
  const [trainLogs, setTrainLogs] = useState<StreamLine[]>([]);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [oobScore, setOobScore] = useState<number | null>(null);

  // ── Predict state ─────────────────────────────────────────────────────────────
  const [predictStatus, setPredictStatus] = useState<StepStatus>('idle');
  const [predictProgress, setPredictProgress] = useState(0);
  const [predictLogs, setPredictLogs] = useState<StreamLine[]>([]);
  const [predictError, setPredictError] = useState<string | null>(null);

  const { consume } = useProgressStream();

  // ── Derived state ─────────────────────────────────────────────────────────────
  const canPreview  = previewStatus !== 'running';
  const canTrain    = previewStatus === 'done' && trainStatus !== 'running';
  const canPredict  = trainStatus === 'done' && predictStatus !== 'running';

  // ── Input handling ────────────────────────────────────────────────────────────

  const handleInputChange = (key: ThresholdKey, value: string) => {
    setRawValues(prev => ({ ...prev, [key]: value }));
    // Clear error on change
    setInputErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /** Validate all inputs and return parsed values, or null if any are invalid */
  const validateThresholds = (): Record<ThresholdKey, number> | null => {
    const errors: Partial<Record<ThresholdKey, string>> = {};
    const parsed: Partial<Record<ThresholdKey, number>> = {};

    for (const { key } of THRESHOLD_FIELDS) {
      const n = parseThreshold(rawValues[key]);
      if (n === null) {
        errors[key] = 'Valor inválido. Rango: [-1.0, 1.0]';
      } else {
        parsed[key] = n;
      }
    }

    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      return null;
    }

    return parsed as Record<ThresholdKey, number>;
  };

  // ── Preview handler ───────────────────────────────────────────────────────────

  const handlePreview = async () => {
    const thresholds = validateThresholds();
    if (!thresholds) return;

    setPreviewStatus('running');
    setPreviewResult(null);
    setPreviewError(null);

    try {
      const response = await fetch(`${API_BASE}/thresholds/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, ...thresholds }),
      });

      if (!response.ok) {
        setPreviewError(httpErrorMessage(response.status));
        setPreviewStatus('error');
        return;
      }

      const data = (await response.json()) as ThresholdPreviewResponse;
      setPreviewResult(data);
      setPreviewStatus('done');
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Error de red al conectar con el servidor.');
      setPreviewStatus('error');
    }
  };

  // ── Train handler ─────────────────────────────────────────────────────────────

  const appendTrainLog = useCallback((line: StreamLine) => {
    setTrainLogs(prev => [...prev, line]);
  }, []);

  const handleTrain = async () => {
    const thresholds = validateThresholds();
    if (!thresholds) return;

    setTrainStatus('running');
    setTrainProgress(0);
    setTrainLogs([]);
    setTrainError(null);
    setOobScore(null);

    await consume(
      `${API_BASE}/train`,
      'POST',
      JSON.stringify({ session_id: sessionId, ...thresholds }),
      // onLine
      (line) => {
        appendTrainLog(line);
        setTrainProgress(line.progress);
      },
      // onDone
      (line) => {
        appendTrainLog(line);
        setTrainProgress(1);
        setTrainStatus('done');
        if (line.oob_score !== undefined) {
          setOobScore(line.oob_score);
        }
      },
      // onError
      (line) => {
        appendTrainLog(line);
        setTrainStatus('error');
        setTrainError(line.error ?? line.message);
      },
    );
  };

  // ── Predict handler ───────────────────────────────────────────────────────────

  const appendPredictLog = useCallback((line: StreamLine) => {
    setPredictLogs(prev => [...prev, line]);
  }, []);

  const handlePredict = async () => {
    setPredictStatus('running');
    setPredictProgress(0);
    setPredictLogs([]);
    setPredictError(null);

    await consume(
      `${API_BASE}/predict`,
      'POST',
      JSON.stringify({ session_id: sessionId }),
      // onLine
      (line) => {
        appendPredictLog(line);
        setPredictProgress(line.progress);
      },
      // onDone
      (line) => {
        appendPredictLog(line);
        setPredictProgress(1);
        setPredictStatus('done');
        onComplete();
      },
      // onError
      (line) => {
        appendPredictLog(line);
        setPredictStatus('error');
        setPredictError(line.error ?? line.message);
      },
    );
  };

  // ── Render helpers ────────────────────────────────────────────────────────────

  const renderStepIndicator = (step: WorkflowStep, label: string) => {
    const statusMap: Record<WorkflowStep, StepStatus> = {
      preview: previewStatus,
      train:   trainStatus,
      predict: predictStatus,
    };
    const s = statusMap[step];
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
        s === 'done'    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
        s === 'running' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
        s === 'error'   ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-zinc-800/60 text-zinc-600 border border-white/5'
      }`}>
        {s === 'done'    && <CheckCircle2 className="w-3 h-3" />}
        {s === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
        {s === 'error'   && <AlertCircle className="w-3 h-3" />}
        {s === 'idle'    && <ChevronRight className="w-3 h-3" />}
        {label}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-6">

      {/* ── Workflow progress indicators ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {renderStepIndicator('preview', 'Previsualizar')}
        <ChevronRight className="w-3 h-3 text-zinc-700" />
        {renderStepIndicator('train', 'Entrenar')}
        <ChevronRight className="w-3 h-3 text-zinc-700" />
        {renderStepIndicator('predict', 'Predecir')}
      </div>

      {/* ── Threshold inputs ── */}
      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Reglas de pseudo-etiquetado</h3>
            <p className="text-xs text-zinc-500">Rango [-1.0, 1.0] · 2 decimales · valores por defecto del notebook</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {THRESHOLD_FIELDS.map(({ key, label, description }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                {label}
              </label>
              <p className="text-[10px] text-zinc-600 mb-2">{description}</p>
              <input
                type="number"
                min={-1.0}
                max={1.0}
                step={0.01}
                value={rawValues[key]}
                onChange={e => handleInputChange(key, e.target.value)}
                className={`w-full bg-black/40 border rounded-xl px-3 py-2 text-sm font-mono text-zinc-200 focus:outline-none focus:ring-1 transition-colors ${
                  inputErrors[key]
                    ? 'border-red-500/50 focus:ring-red-500/30'
                    : 'border-white/10 focus:ring-purple-500/30 focus:border-purple-500/40'
                }`}
              />
              {inputErrors[key] && (
                <p className="mt-1 text-[10px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {inputErrors[key]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: Preview thresholds ── */}
      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Eye className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Paso 1 — Previsualizar umbrales</h3>
              <p className="text-xs text-zinc-500">Conteo de píxeles por clase sin entrenar el modelo</p>
            </div>
          </div>
        </div>

        <button
          onClick={handlePreview}
          disabled={!canPreview}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            !canPreview
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-600/20'
          }`}
        >
          {previewStatus === 'running' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Calculando…</>
          ) : (
            <><Eye className="w-4 h-4" /> Previsualizar umbrales</>
          )}
        </button>

        {/* Preview error */}
        {previewStatus === 'error' && previewError && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400 font-medium">{previewError}</p>
          </div>
        )}

        {/* Preview results */}
        {previewStatus === 'done' && previewResult && (
          <div className="animate-fade-in">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Conteo de píxeles etiquetados
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total válidos</p>
                <p className="text-lg font-mono font-bold text-zinc-200">
                  {previewResult.total_valid.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Leaf className="w-3 h-3 text-emerald-400" />
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Vegetación</p>
                </div>
                <p className="text-lg font-mono font-bold text-emerald-400">
                  {previewResult.vegetation.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Agua</p>
                </div>
                <p className="text-lg font-mono font-bold text-blue-400">
                  {previewResult.water.toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Mountain className="w-3 h-3 text-amber-400" />
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Minería</p>
                </div>
                <p className="text-lg font-mono font-bold text-amber-400">
                  {previewResult.mining.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Step 2: Train model ── */}
      <div className={`bg-zinc-900/40 rounded-2xl border p-6 space-y-4 transition-colors ${
        canTrain ? 'border-white/5' : 'border-white/[0.02] opacity-60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            canTrain ? 'bg-purple-500/10 border-purple-500/20' : 'bg-zinc-800/40 border-white/5'
          }`}>
            <Play className={`w-4 h-4 ${canTrain ? 'text-purple-400' : 'text-zinc-600'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Paso 2 — Entrenar modelo</h3>
            <p className="text-xs text-zinc-500">Random Forest · 100 estimadores · validación out-of-bag</p>
          </div>
        </div>

        <button
          onClick={handleTrain}
          disabled={!canTrain}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            !canTrain
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
          }`}
        >
          {trainStatus === 'running' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Entrenando…</>
          ) : (
            <><Play className="w-4 h-4" /> Entrenar modelo</>
          )}
        </button>

        {/* Train progress + logs */}
        {(trainStatus === 'running' || trainStatus === 'done' || trainStatus === 'error') && (
          <div className="space-y-4">
            <div className="bg-black/20 rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                {trainStatus === 'running' && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                {trainStatus === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {trainStatus === 'error'   && <AlertCircle className="w-4 h-4 text-red-400" />}
                <span className="text-sm font-bold text-zinc-300">
                  {trainStatus === 'running' && 'Entrenando clasificador…'}
                  {trainStatus === 'done'    && 'Entrenamiento completado'}
                  {trainStatus === 'error'   && 'Error en el entrenamiento'}
                </span>
              </div>
              <ProgressBar
                progress={trainProgress}
                label={trainStatus === 'running' ? 'Progreso' : undefined}
              />
            </div>

            {trainStatus === 'error' && trainError && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{trainError}</p>
              </div>
            )}

            {trainStatus === 'done' && oobScore !== null && (
              <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">OOB Accuracy</p>
                  <p className="text-2xl font-mono font-bold text-emerald-400">
                    {(oobScore * 100).toFixed(2)} %
                  </p>
                </div>
              </div>
            )}

            <LogConsole lines={trainLogs} />
          </div>
        )}
      </div>

      {/* ── Step 3: Predict map ── */}
      <div className={`bg-zinc-900/40 rounded-2xl border p-6 space-y-4 transition-colors ${
        canPredict ? 'border-white/5' : 'border-white/[0.02] opacity-60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${
            canPredict ? 'bg-teal-500/10 border-teal-500/20' : 'bg-zinc-800/40 border-white/5'
          }`}>
            <Map className={`w-4 h-4 ${canPredict ? 'text-teal-400' : 'text-zinc-600'}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Paso 3 — Predecir mapa</h3>
            <p className="text-xs text-zinc-500">Clasifica todos los píxeles válidos de la escena</p>
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={!canPredict}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            !canPredict
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20'
          }`}
        >
          {predictStatus === 'running' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Prediciendo…</>
          ) : predictStatus === 'done' ? (
            <><CheckCircle2 className="w-4 h-4" /> Predicción completada</>
          ) : (
            <><Map className="w-4 h-4" /> Predecir mapa</>
          )}
        </button>

        {/* Predict progress + logs */}
        {(predictStatus === 'running' || predictStatus === 'done' || predictStatus === 'error') && (
          <div className="space-y-4">
            <div className="bg-black/20 rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                {predictStatus === 'running' && <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />}
                {predictStatus === 'done'    && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {predictStatus === 'error'   && <AlertCircle className="w-4 h-4 text-red-400" />}
                <span className="text-sm font-bold text-zinc-300">
                  {predictStatus === 'running' && 'Clasificando píxeles…'}
                  {predictStatus === 'done'    && 'Mapa generado — avanzando al paso 5…'}
                  {predictStatus === 'error'   && 'Error en la predicción'}
                </span>
              </div>
              <ProgressBar
                progress={predictProgress}
                label={predictStatus === 'running' ? 'Progreso' : undefined}
              />
            </div>

            {predictStatus === 'error' && predictError && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-medium">{predictError}</p>
              </div>
            )}

            <LogConsole lines={predictLogs} />
          </div>
        )}
      </div>

    </div>
  );
}
