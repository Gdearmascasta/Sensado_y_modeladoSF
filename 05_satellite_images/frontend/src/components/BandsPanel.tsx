import { useState, useCallback } from 'react';
import { Layers, Download, AlertCircle, CheckCircle2, Loader2, Calendar, Cloud, Hash } from 'lucide-react';
import type { StreamLine } from '../types';
import { useProgressStream } from '../hooks/useProgressStream';
import ProgressBar from './ProgressBar';
import LogConsole from './LogConsole';

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = 'http://localhost:8004';

// ── Types ──────────────────────────────────────────────────────────────────────

type DownloadStatus = 'idle' | 'downloading' | 'done' | 'error';

interface BandsPanelProps {
  sessionId: string;
  sceneInfo: { id: string; datetime: string; cloudCover: number };
  onComplete: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BandsPanel({ sessionId, sceneInfo, onComplete }: BandsPanelProps) {
  const [status, setStatus] = useState<DownloadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<StreamLine[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0); // force img reload

  const { consume } = useProgressStream();

  const appendLog = useCallback((line: StreamLine) => {
    setLogs(prev => [...prev, line]);
  }, []);

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(0);
    setLogs([]);
    setErrorMsg(null);

    await consume(
      `${API_BASE}/download`,
      'POST',
      JSON.stringify({ session_id: sessionId }),
      // onLine — progress update
      (line) => {
        appendLog(line);
        setProgress(line.progress);
      },
      // onDone
      (line) => {
        appendLog(line);
        setProgress(1);
        setStatus('done');
        setPreviewKey(k => k + 1);
        onComplete();
      },
      // onError
      (line) => {
        appendLog(line);
        setStatus('error');
        setErrorMsg(line.error ?? line.message);
      },
    );
  };

  const handleRetry = () => {
    setStatus('idle');
    setProgress(0);
    setLogs([]);
    setErrorMsg(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-6">

      {/* ── Scene metadata card ── */}
      <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Escena seleccionada</h3>
            <p className="text-xs text-zinc-500">Sentinel-2 L2A — Bandas B02, B03, B04, B08, B11</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Hash className="w-3 h-3 text-zinc-600" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ID de escena</p>
            </div>
            <p className="text-xs font-mono text-zinc-300 break-all">{sceneInfo.id}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3 h-3 text-zinc-600" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Fecha de adquisición</p>
            </div>
            <p className="text-sm font-mono text-zinc-200">{sceneInfo.datetime.slice(0, 10)}</p>
          </div>
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Cloud className="w-3 h-3 text-zinc-600" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cobertura nubosa</p>
            </div>
            <p className="text-sm font-mono text-blue-400 font-bold">{sceneInfo.cloudCover.toFixed(1)} %</p>
          </div>
        </div>
      </div>

      {/* ── Download button / status ── */}
      {status === 'idle' && (
        <button
          onClick={handleDownload}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-[0.98]"
        >
          <Download className="w-5 h-5" />
          Descargar bandas
        </button>
      )}

      {status === 'error' && (
        <button
          onClick={handleRetry}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all shadow-lg flex items-center justify-center gap-3 bg-zinc-700 hover:bg-zinc-600 text-white active:scale-[0.98]"
        >
          <Download className="w-5 h-5" />
          Reintentar descarga
        </button>
      )}

      {/* ── Progress section (visible while downloading or after error) ── */}
      {(status === 'downloading' || status === 'error' || status === 'done') && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              {status === 'downloading' && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              )}
              {status === 'done' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              {status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-sm font-bold text-zinc-300">
                {status === 'downloading' && 'Descargando bandas…'}
                {status === 'done' && 'Descarga completada'}
                {status === 'error' && 'Error en la descarga'}
              </span>
            </div>
            <ProgressBar
              progress={progress}
              label={status === 'downloading' ? 'Progreso' : undefined}
            />
          </div>

          {/* Error message */}
          {status === 'error' && errorMsg && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400 font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Log console */}
          <LogConsole lines={logs} />
        </div>
      )}

      {/* ── True color preview (shown after successful download) ── */}
      {status === 'done' && (
        <div className="bg-zinc-900/40 rounded-2xl border border-white/5 p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Vista en color real</h3>
              <p className="text-xs text-zinc-500">Bandas B04/B03/B02 normalizadas por percentiles (2–98)</p>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border border-white/5 bg-black/40">
            <img
              key={previewKey}
              src={`${API_BASE}/preview/truecolor?session_id=${sessionId}`}
              alt="Vista en color real de la escena Sentinel-2"
              className="w-full object-contain max-h-[480px]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                setErrorMsg('No se pudo cargar la imagen de previsualización.');
              }}
            />
          </div>

          {/* Metadata below the image */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">ID de escena</p>
              <p className="text-xs font-mono text-zinc-300 break-all">{sceneInfo.id}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Fecha</p>
              <p className="text-sm font-mono text-zinc-200">{sceneInfo.datetime.slice(0, 10)}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nubes</p>
              <p className="text-sm font-mono text-emerald-400 font-bold">{sceneInfo.cloudCover.toFixed(1)} %</p>
            </div>
          </div>

          {/* Advance to next step */}
          <button
            onClick={onComplete}
            className="mt-6 w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.98]"
          >
            <CheckCircle2 className="w-4 h-4" />
            Continuar a Índices Espectrales
          </button>
        </div>
      )}
    </div>
  );
}
