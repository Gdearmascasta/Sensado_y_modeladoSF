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
      // Silently fail
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
        <span className="mb-2 block text-xs font-semibold tracking-wide text-zinc-400 uppercase">
          {label}
        </span>
      )}
      <div className="group relative overflow-hidden rounded-xl bg-black/40 border border-white/5 backdrop-blur-sm">
        <pre
          ref={preRef}
          className="overflow-x-auto p-4 pr-44 font-mono text-[13px] leading-relaxed text-zinc-300"
        >
          <code>{code}</code>
        </pre>
        <div className="absolute right-2 top-2 flex space-x-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            style={{
              backgroundColor: running ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.8)',
              color: running ? '#60a5fa' : '#fff',
            }}
          >
            <Play size={11} className={running ? 'animate-pulse' : ''} />
            <span>{running ? 'Lanzando...' : 'Ejecutar'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
            style={{
              backgroundColor: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
              color: copied ? '#10b981' : '#71717a',
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
}
