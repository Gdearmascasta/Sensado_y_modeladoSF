import { useEffect, useRef } from 'react';
import type { StreamLine } from '../types';

interface LogConsoleProps {
  lines: StreamLine[];
  maxLines?: number;
}

function lineColor(stage: string): string {
  if (stage === 'error') return 'text-red-400';
  if (stage === 'done')  return 'text-emerald-400';
  return 'text-zinc-400';
}

export default function LogConsole({ lines, maxLines = 40 }: LogConsoleProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Keep only the last N lines
  const visible = lines.slice(-maxLines);

  // Auto-scroll to bottom whenever lines change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="w-full bg-black rounded-2xl border border-white/5 p-4 shadow-inner">
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
          Console
        </span>
        <div className="w-2 h-2 rounded-full bg-zinc-700" />
      </div>

      <div className="font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
        {visible.length === 0 ? (
          <span className="text-zinc-700">Esperando mensajes...</span>
        ) : (
          visible.map((line, i) => (
            <div key={i} className={`flex gap-2 ${lineColor(line.stage)}`}>
              <span className="text-zinc-700 shrink-0">
                [{Math.round(line.progress * 100).toString().padStart(3, ' ')}%]
              </span>
              <span className="break-all">{line.message}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
