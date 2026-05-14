interface ProgressBarProps {
  progress: number;   // 0.0 – 1.0
  label?: string;
}

export default function ProgressBar({ progress, label }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  // Color shifts from blue → emerald when done
  const barColor =
    pct >= 100
      ? 'bg-emerald-500 shadow-emerald-500/30'
      : 'bg-blue-500 shadow-blue-500/30';

  const textColor = pct >= 100 ? 'text-emerald-400' : 'text-blue-400';

  return (
    <div className="w-full">
      {(label || pct > 0) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              {label}
            </span>
          )}
          <span className={`text-xs font-mono font-bold ml-auto ${textColor}`}>
            {pct}%
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full rounded-full shadow-lg transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
