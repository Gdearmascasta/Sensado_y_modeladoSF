import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppDefinition } from '../types';
import { Play, Loader2, X, ExternalLink, Terminal } from 'lucide-react';

interface AppLauncherManagerProps {
  app: AppDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AppLauncherManager({ app, isOpen, onClose }: AppLauncherManagerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // States: 'idle' | 'launching' | 'running'
  const [status, setStatus] = useState<'idle' | 'launching' | 'running'>('idle');
  const [launchProgress, setLaunchProgress] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setLaunchProgress(0);
      return;
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  const launchAll = async () => {
    if (!app || !app.launchSteps) return;
    setStatus('launching');
    setLaunchProgress(0);
    
    // Launch all steps sequentially
    for (let i = 0; i < app.launchSteps.length; i++) {
        const step = app.launchSteps[i];
        try {
            await fetch('/api/run-command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: step.command })
            });
            setLaunchProgress(Math.floor(((i + 1) / app.launchSteps.length) * 100));
            // Add a tiny delay to ensure proper port bounding order for some apps
            await new Promise((r) => setTimeout(r, 1500)); 
        } catch(e) {
            console.error(e);
        }
    }
    
    // Wait a brief moment before switching to 'running' to let servers spin up fully
    setTimeout(() => {
        setStatus('running');
    }, 2000);
  };

  if (!isOpen || !app) return null;

  // Determine view based on status
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`App de Lanzamiento ${app.name}`}
    >
      <div
        ref={panelRef}
        className={`relative mx-4 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            status === 'running' && app.previewUrl ? 'w-[90vw] h-[90vh]' : 'w-full max-w-lg max-h-[85vh]'
        }`}
      >
        {/* Glow effect */}
        <div 
            className="absolute -top-32 -left-32 h-64 w-64 rounded-full blur-[100px] opacity-30 pointer-events-none"
            style={{ backgroundColor: app.accentColor }} 
        />
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X size={20} />
        </button>

        {status === 'idle' && (
           <div className="p-8 flex flex-col items-center text-center">
             <div className="mb-6 p-4 rounded-3xl bg-white/5 border border-white/10 shadow-lg">
                <span className="text-6xl drop-shadow-md">{app.icon}</span>
             </div>
             <h2 className="text-2xl font-bold tracking-tight text-white">{app.name}</h2>
             <p className="mt-2 text-sm text-zinc-400 mb-8">{app.description}</p>
             
             {app.launchSteps && app.launchSteps.length > 0 ? (
                 <button
                    onClick={launchAll}
                    style={{ backgroundColor: app.accentColor }}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl px-6 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                 >
                    <Play size={20} fill="currentColor" />
                    <span>Lanzar Aplicación</span>
                 </button>
             ) : (
                 <button
                    onClick={() => app.url ? window.open(app.url, '_blank') : null}
                    style={{ backgroundColor: app.accentColor }}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl px-6 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                 >
                    <ExternalLink size={20} />
                    <span>Abrir Enlace</span>
                 </button>
             )}
           </div>
        )}

        {status === 'launching' && (
            <div className="p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Loader2 size={48} className="animate-spin text-white mb-6" style={{ color: app.accentColor }} />
                <h3 className="text-xl font-bold text-white">Preparando Sistemas...</h3>
                <p className="mt-2 text-sm text-zinc-400">Ejecutando la secuencia localmente</p>
                <div className="mt-8 w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className="h-full transition-all duration-500 ease-out" 
                        style={{ width: `${launchProgress}%`, backgroundColor: app.accentColor }} 
                    />
                </div>
            </div>
        )}

        {status === 'running' && (
            <div className="flex flex-col h-full w-full">
                {app.previewUrl ? (
                    <>
                        <div className="flex items-center space-x-3 px-4 py-3 bg-black/60 border-b border-white/10">
                            <span className="text-xl">{app.icon}</span>
                            <span className="text-sm font-medium text-white">{app.name}</span>
                            <span className="ml-auto inline-flex items-center space-x-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                                <span>Running local</span>
                            </span>
                        </div>
                        <div className="flex-1 w-full relative bg-zinc-950">
                            {/* We add a fade-in animation for iframe to hide jumping */}
                            <iframe 
                                src={app.previewUrl} 
                                className="absolute inset-0 w-full h-full border-0 animate-in fade-in duration-1000"
                                title={app.name}
                            />
                        </div>
                    </>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-center min-h-[350px]">
                        <div className="relative mb-6">
                            <Terminal size={64} className="text-white/20" />
                            <div className="absolute -bottom-2 -right-2 h-4 w-4 animate-ping rounded-full bg-green-500"></div>
                            <div className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-green-500"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-white">Ejecución Activa</h3>
                        <p className="mt-3 text-base text-zinc-400 max-w-sm">
                            Esta aplicación es nativa (<span className="text-white font-medium">PyQt6 / Terminal</span>) y no puede ser incrustada aquí. Revisa tu barra de tareas u otras pantallas.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-8 rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                        >
                            Cerrar Panel
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
