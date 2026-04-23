import { useState } from 'react';
import type { AppDefinition } from './types';
import { appRegistry } from './data/appRegistry';
import Header from './components/Header';
import BentoGrid from './components/BentoGrid';
import AppLauncherManager from './components/AppLauncherManager';

function App() {
  const [selectedApp, setSelectedApp] = useState<AppDefinition | null>(null);

  const handleAppClick = (app: AppDefinition) => {
    // All apps simply open the launcher manager. The manager handles the links vs execution.
    setSelectedApp(app);
  };

  const handleCloseManager = () => {
    setSelectedApp(null);
  };

  return (
    <div className="relative min-h-screen bg-[#030308] text-white overflow-hidden pb-12 font-sans selection:bg-primary/30">
      {/* Premium Glassmorphism Background Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/20 mix-blend-screen blur-[128px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-violet-600/20 mix-blend-screen blur-[128px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/10 mix-blend-screen blur-[128px]" />
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 opacity-[0.03] mix-blend-overlay"></div>

      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-6xl px-6 sm:px-8 mt-4">
          <BentoGrid apps={appRegistry} onAppClick={handleAppClick} />
        </main>
      </div>

      <AppLauncherManager
        app={selectedApp}
        isOpen={selectedApp !== null}
        onClose={handleCloseManager}
      />
    </div>
  );
}

export default App;
