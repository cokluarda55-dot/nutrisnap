'use client';

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color: 'protein' | 'carbs' | 'fat';
}

export default function MacroBar({
  label,
  consumed,
  target,
  unit = 'g',
  color,
}: MacroBarProps) {
  const validTarget = target > 0 ? target : 100;
  const percentage = Math.min(Math.round((consumed / validTarget) * 100), 100);

  const colorStyles = {
    protein: {
      bar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    carbs: {
      bar: 'bg-gradient-to-r from-amber-500 to-orange-500',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    fat: {
      bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
  }[color];

  return (
    <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-400">{label}</span>
        <span className={`font-semibold ${colorStyles.text}`}>
          {Math.round(consumed)}{unit}
        </span>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorStyles.bar} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
        <span>{percentage}%</span>
        <span>Goal: {validTarget}{unit}</span>
      </div>
    </div>
  );
}
