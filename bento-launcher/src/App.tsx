import { useState, useEffect } from 'react';
import type { AppDefinition } from './types';
import { appRegistry } from './data/appRegistry';
import Header from './components/Header';
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
    <div className="relative min-h-screen bg-background text-white overflow-hidden font-sans selection:bg-primary/30">
      {/* ── Background layers ── */}

      {/* Deep technical blueprint grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />

      {/* Ghosted mathematical symbols */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-[15%] left-[10%] text-9xl font-serif text-white transform -rotate-12 blur-[2px]">&sum;</div>
        <div className="absolute bottom-[20%] right-[15%] text-[12rem] font-serif text-white transform rotate-6 blur-[3px]">&int;</div>
        <div className="absolute top-[60%] left-[5%] text-8xl font-serif text-white transform rotate-12 blur-[1px]">&part;</div>
        <div className="absolute top-[30%] right-[8%] text-8xl font-serif text-white transform -rotate-6 blur-[2px]">&nabla;</div>
      </div>

      {/* Ghosted vector force arrows (SVG) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-5">
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

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[800px] w-[800px] rounded-full bg-blue-600/[0.04] mix-blend-screen blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-[800px] w-[800px] rounded-full bg-violet-600/[0.04] mix-blend-screen blur-[150px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/[0.02] mix-blend-screen blur-[120px]" />

      {/* Noise texture */}
      <div className="pointer-events-none absolute inset-0 noise-overlay" />

      {/* ── Content ── */}
      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-6xl px-6 sm:px-8 pb-16">
          <BentoGrid apps={appRegistry} onAppClick={handleAppClick} appStates={appStates} />
        </main>
      </div>

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
