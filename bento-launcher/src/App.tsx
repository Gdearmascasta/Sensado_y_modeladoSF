import { useState, useEffect } from 'react';
import type { AppDefinition } from './types';
import { appRegistry } from './data/appRegistry';
import BentoGrid from './components/BentoGrid';
import AppLauncherManager from './components/AppLauncherManager';

function App() {
  const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);
  const [appStates, setAppStates] = useState<Record<string, 'idle' | 'launching' | 'running'>>({});

  useEffect(() => {
    fetch('/api/active-apps')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeApps && Array.isArray(data.activeApps)) {
          setAppStates((prev) => {
            const newStates = { ...prev };
            data.activeApps.forEach((appId: string) => {
              newStates[appId] = 'running';
            });
            return newStates;
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleAppClick = (app: AppDefinition) => {
    setSelectedApp(app);
  };

  const handleCloseManager = () => {
    setSelectedApp(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans text-white selection:bg-primary/30">
      {/* ── Background layers ── */}

      {/* Deep technical blueprint grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:100px_100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:20px_20px]" />

      {/* Ghosted mathematical symbols */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]">
        <div className="absolute left-[10%] top-[15%] -rotate-12 transform font-serif text-9xl text-white blur-[2px]">&sum;</div>
        <div className="absolute bottom-[20%] right-[15%] rotate-6 transform font-serif text-[12rem] text-white blur-[3px]">&int;</div>
        <div className="absolute left-[5%] top-[60%] rotate-12 transform font-serif text-8xl text-white blur-[1px]">&part;</div>
        <div className="absolute right-[8%] top-[30%] -rotate-6 transform font-serif text-8xl text-white blur-[2px]">&nabla;</div>
      </div>

      {/* Ghosted vector force arrows (SVG) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="white" />
            </marker>
          </defs>
          <g stroke="white" strokeWidth="2" fill="none" markerEnd="url(#arrow)">
            <path d="M 200 800 Q 400 600 600 400" />
            <path d="M 800 200 L 1000 100" />
            <path d="M 100 200 Q 200 400 300 300" />
            <path d="M 1200 700 Q 1000 800 900 600" />
          </g>
        </svg>
      </div>

      {/* Ambient orbs — más presencia para dar atmósfera */}
      <div className="pointer-events-none absolute -left-64 -top-64 h-[900px] w-[900px] rounded-full bg-blue-600/[0.06] mix-blend-screen blur-[160px]" />
      <div className="pointer-events-none absolute -bottom-64 -right-64 h-[900px] w-[900px] rounded-full bg-violet-600/[0.06] mix-blend-screen blur-[160px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/[0.03] mix-blend-screen blur-[130px]" />
      {/* Orb adicional — acento cálido arriba-derecha */}
      <div className="pointer-events-none absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-amber-500/[0.03] mix-blend-screen blur-[120px]" />

      {/* Noise texture */}
      <div className="pointer-events-none absolute inset-0 noise-overlay" />

      {/* ── Content — pure bento, no separate header ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-14">
        <BentoGrid apps={appRegistry} onAppClick={handleAppClick} appStates={appStates} />
      </main>

      <AppLauncherManager
        app={selectedApp}
        isOpen={selectedApp !== null}
        onClose={handleCloseManager}
        status={selectedApp ? (appStates[selectedApp.id] || 'idle') : 'idle'}
        setStatus={(status) => {
          if (selectedApp) {
            setAppStates((prev) => ({ ...prev, [selectedApp.id]: status }));
          }
        }}
      />
    </div>
  );
}

export default App;
