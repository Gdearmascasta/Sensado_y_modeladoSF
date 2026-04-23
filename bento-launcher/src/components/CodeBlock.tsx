import { useState, useCallback, useRef } from 'react';
import { Play } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  label?: string;
}

export default function CodeBlock({ code, label }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback: document.execCommand('copy')
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail — no UI breakage
    }
  }, [code]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      await fetch('/api/run-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: code }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRunning(false), 1000);
    }
  }, [code]);

  return (
    <div className="relative">
      {label && (
        <span className="mb-1 block text-xs font-medium text-zinc-400">
          {label}
        </span>
      )}
      <div className="group relative rounded-lg bg-zinc-900 border border-zinc-800">
        <pre
          ref={preRef}
          className="overflow-x-auto p-4 pr-40 font-mono text-sm leading-relaxed text-zinc-200"
        >
          <code>{code}</code>
        </pre>
        <div className="absolute right-2 top-2 flex space-x-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="flex items-center space-x-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            style={{
              backgroundColor: running ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.8)',
              color: running ? '#60a5fa' : '#ffffff',
            }}
          >
            <Play size={12} className={running ? 'animate-pulse' : ''} />
            <span>{running ? 'Lanzando...' : 'Ejecutar'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-zinc-900"
            style={{
              backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(63, 63, 70, 0.6)',
              color: copied ? '#10b981' : '#a1a1aa',
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}
