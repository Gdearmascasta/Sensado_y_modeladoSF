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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Lanzar ${app.name}`}
    >
      <div
        ref={panelRef}
        className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <span className="text-2xl">{app.icon}</span>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">{app.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">{app.description}</p>
        </div>

        {/* Launch steps */}
        {app.launchSteps && app.launchSteps.length > 0 && (
          <ol className="space-y-4">
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
