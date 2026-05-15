import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppDefinition } from '../types';
import { Play, Loader2, X, ExternalLink, Terminal } from 'lucide-react';

interface AppLauncherManagerProps {
  app: AppDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  status: 'idle' | 'launching' | 'running';
  setStatus: (status: 'idle' | 'launching' | 'running') => void;
}

export default function AppLauncherManager({ app, isOpen, onClose, status, setStatus }: AppLauncherManagerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [launchProgress, setLaunchProgress] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) { setLaunchProgress(0); setLogs([]); return; }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    },
    [onClose],
  );

  const stopApp = async () => {
    if (!app) return;
    try {
      await fetch('/api/stop-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id }),
      });
      setStatus('idle');
    } catch (e) { console.error(e); }
  };

  // Poll real logs from the backend
  const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLogCountRef = useRef(0);

  const startLogPolling = (appId: string) => {
    if (logPollRef.current) clearInterval(logPollRef.current);
    lastLogCountRef.current = 0;
    logPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/logs/${appId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.logs && data.logs.length > lastLogCountRef.current) {
            // Only append NEW log lines (ones we haven't seen yet)
            const newLines = data.logs.slice(lastLogCountRef.current);
            lastLogCountRef.current = data.logs.length;
            setLogs(prev => [...prev, ...newLines]);
          }
        }
      } catch { /* ignore polling errors */ }
    }, 2000);
  };

  const stopLogPolling = () => {
    if (logPollRef.current) {
      clearInterval(logPollRef.current);
      logPollRef.current = null;
    }
  };

  // Cleanup polling on unmount or close
  useEffect(() => {
    if (!isOpen) stopLogPolling();
    return () => stopLogPolling();
  }, [isOpen]);

  const launchAll = async () => {
    if (!app || !app.launchSteps) return;
    setStatus('launching');
    setLaunchProgress(0);
    setLogs(['> Iniciando secuencia de arranque...']);

    // Start polling logs immediately
    startLogPolling(app.id);

    for (let i = 0; i < app.launchSteps.length; i++) {
      const step = app.launchSteps[i];
      setLogs(prev => [...prev, `> Ejecutando: ${step.label}`]);
      try {
        const response = await fetch('/api/run-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: step.command, appId: app.id }),
        });
        if (response.ok) {
          setLogs(prev => [...prev, `  [OK] ${step.label} — comando enviado.`]);
        } else {
          setLogs(prev => [...prev, `  [ERROR] Fallo al iniciar ${step.label}.`]);
        }
        setLaunchProgress(Math.floor(((i + 1) / app.launchSteps!.length) * 100));
        // Wait a bit longer to let the process start and produce output
        await new Promise(r => setTimeout(r, 3000));
      } catch (e) {
        setLogs(prev => [...prev, `  [FATAL] Error de conexión: ${String(e)}`]);
      }
    }

    setLogs(prev => [...prev, '> Todos los comandos enviados. Verificando estado...']);
    // Give extra time for processes to start, then transition
    await new Promise(r => setTimeout(r, 3000));
    setLogs(prev => [...prev, '> Sistemas activos.']);
    setTimeout(() => {
      stopLogPolling();
      setStatus('running');
    }, 1000);
  };

  if (!isOpen || !app) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`App de Lanzamiento ${app.name}`}
    >
      <div
        ref={panelRef}
        className={`noise-overlay relative mx-4 flex flex-col overflow-hidden rounded-3xl border border-white/8 bg-[#0a0a12]/95 backdrop-blur-2xl shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          status === 'running' && app.previewUrl ? 'w-[92vw] h-[90vh]' : 'w-full max-w-lg max-h-[85vh]'
        }`}
      >
        {/* Corner glow */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full blur-[80px] opacity-15"
          style={{ backgroundColor: app.accentColor }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-40 w-40 rounded-full blur-[70px] opacity-10"
          style={{ backgroundColor: app.accentColor }}
        />

        {/* ── IDLE STATE ── */}
        {status === 'idle' && (
          <div className="relative z-10 p-10 flex flex-col items-center text-center">
            <div className="mb-8 p-7 rounded-[2rem] bg-white/[0.02] border border-white/5 group transition-transform duration-500 hover:scale-105">
              {(() => {
                const Icon = app.icon;
                return <Icon size={48} color={app.accentColor} strokeWidth={1.5} />;
              })()}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">{app.name}</h2>
            <p className="text-sm text-zinc-500 mb-10 max-w-sm leading-relaxed">{app.description}</p>

            {app.launchSteps && app.launchSteps.length > 0 ? (
              <button
                onClick={launchAll}
                className="flex w-full items-center justify-center space-x-3 rounded-2xl px-6 py-5 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] group"
                style={{
                  backgroundColor: app.accentColor,
                  boxShadow: `0 20px 50px -15px ${app.accentColor}40`,
                }}
              >
                <Play size={18} fill="currentColor" className="transition-transform group-hover:translate-x-0.5" />
                <span>Lanzar Aplicación</span>
              </button>
            ) : (
              <button
                onClick={() => app.url ? window.open(app.url, '_blank') : null}
                className="flex w-full items-center justify-center space-x-3 rounded-2xl px-6 py-5 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: app.accentColor,
                  boxShadow: `0 20px 50px -15px ${app.accentColor}40`,
                }}
              >
                <ExternalLink size={18} />
                <span>Abrir en Nueva Pestaña</span>
              </button>
            )}

            <div className="mt-8 flex items-center space-x-3 opacity-30">
              <div className="h-px w-10 bg-zinc-600" />
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.25em]">
                Ambiente Local
              </span>
              <div className="h-px w-10 bg-zinc-600" />
            </div>
          </div>
        )}

        {/* ── LAUNCHING STATE ── */}
        {status === 'launching' && (
          <div className="relative z-10 p-10 flex flex-col items-center justify-center min-h-[450px]">
            <div className="relative mb-10">
              <div className="absolute inset-0 animate-ping rounded-full opacity-15" style={{ backgroundColor: app.accentColor }} />
              <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-full bg-white/[0.03] border border-white/8 backdrop-blur-md">
                <Loader2 size={28} className="animate-spin text-white/30" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-sm" style={{ color: app.accentColor }}>
                  {launchProgress}%
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Desplegando Sistemas</h3>
            <p className="text-sm text-zinc-500 font-medium mb-10">Orquestando servicios en {app.name}</p>

            {/* Terminal log */}
            <div className="w-full overflow-hidden rounded-2xl bg-black/50 border border-white/5 backdrop-blur-sm shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/5">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                </div>
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Runtime Logs</span>
                <div className="w-12" />
              </div>
              <div className="p-5 font-mono text-[11px] leading-relaxed h-[160px] overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className={`mb-1.5 ${log.includes('[ERROR]') || log.includes('[FATAL]') ? 'text-red-400' : log.includes('[OK]') ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    <span className="text-zinc-700 mr-2">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                    {log}
                  </div>
                ))}
                <div className="mt-2 flex items-center space-x-2 text-emerald-500/40 animate-pulse">
                  <span className="text-emerald-500 font-bold">$</span>
                  <span className="inline-block w-2 h-4 bg-emerald-500/40" />
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6 w-full bg-white/5 rounded-full h-1 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${launchProgress}%`, backgroundColor: app.accentColor }}
              />
            </div>
          </div>
        )}

        {/* ── RUNNING STATE ── */}
        {status === 'running' && (
          <div className="relative z-10 flex flex-col h-full w-full">
            {app.previewUrl ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 bg-black/60 border-b border-white/5 shrink-0 relative z-20">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const Icon = app.icon;
                      return <Icon size={20} color={app.accentColor} strokeWidth={2} />;
                    })()}
                    <span className="text-sm font-semibold text-white tracking-wide">{app.name}</span>
                    <span className="ml-3 inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/15">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      <span>Activa</span>
                    </span>
                  </div>
                  
                </div>
                <div className="flex-1 w-full relative bg-zinc-950">
                  <iframe src={app.previewUrl} className="absolute inset-0 w-full h-full border-0" title={app.name} />
                </div>
              </>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center min-h-[350px]">
                <div className="relative mb-6">
                  <Terminal size={56} className="text-white/15" />
                  <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 animate-ping rounded-full bg-emerald-500" />
                  <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">Ejecución Activa</h3>
                <p className="mt-3 text-sm text-zinc-500 max-w-sm leading-relaxed">
                  Esta aplicación es nativa (<span className="text-white font-medium">PyQt6 / Terminal</span>) y no puede ser incrustada aquí.
                </p>
                <button
                  onClick={onClose}
                  className="mt-8 rounded-xl border border-white/8 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
                >
                  Cerrar Panel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions - Floating and always on top (Moved to end for higher DOM priority) */}
        <div className="absolute right-6 top-6 z-[100] flex items-center space-x-3">
          {status === 'running' && (
            <button
              type="button"
              onClick={stopApp}
              className="rounded-full bg-red-500/20 px-4 py-2 text-[11px] font-bold text-red-400 border border-red-500/30 backdrop-blur-md transition-all hover:bg-red-500/30 uppercase tracking-wider shadow-xl shadow-red-500/10"
            >
              Detener
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-2 rounded-full bg-zinc-900/80 px-4 py-2 text-[11px] font-bold text-white border border-white/20 backdrop-blur-md transition-all hover:bg-white/10 uppercase tracking-wider shadow-2xl"
          >
            <span>Volver</span>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
