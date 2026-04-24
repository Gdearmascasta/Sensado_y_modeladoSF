import { useEffect, useCallback, useRef } from 'react';
import type { AppDefinition } from '../types';
import CodeBlock from './CodeBlock';

interface InstructionModalProps {
  app: AppDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InstructionModal({ app, isOpen, onClose }: InstructionModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
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

  if (!isOpen || !app) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Lanzar ${app.name}`}
    >
      <div
        ref={panelRef}
        className="noise-overlay relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/8 bg-[#0a0a12]/95 p-8 shadow-2xl backdrop-blur-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 border border-white/5 text-zinc-500 transition-all hover:bg-white/10 hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-8 pr-10">
          <span className="text-4xl drop-shadow-2xl">{app.icon}</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">{app.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{app.description}</p>
        </div>

        {/* Launch steps */}
        {app.launchSteps && app.launchSteps.length > 0 && (
          <ol className="space-y-5">
            {app.launchSteps.map((step, index) => (
              <li key={index}>
                <CodeBlock
                  code={step.command}
                  label={`${index + 1}. ${step.label}`}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
