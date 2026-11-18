'use client';

interface CalorieRingProps {
  consumed: number;
  target: number;
}

export default function CalorieRing({ consumed, target }: CalorieRingProps) {
  const radius = 80;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const validTarget = target > 0 ? target : 2000;
  const percentage = Math.min(Math.round((consumed / validTarget) * 100), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const remaining = validTarget - consumed;
  const isOver = remaining < 0;

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 drop-shadow-md"
        >
          <defs>
            <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="overGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background circle track */}
          <circle
            stroke="#1e293b"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />

          {/* Active progress stroke */}
          <circle
            stroke={isOver ? 'url(#overGradient)' : 'url(#calorieGradient)'}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <span className="text-4xl font-extrabold tracking-tight text-white">
            {consumed}
          </span>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
            / {validTarget} kcal
          </span>
          <div className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800/80 border border-slate-700/60 text-slate-300">
            {isOver ? (
              <span className="text-amber-400 font-semibold">+{Math.abs(remaining)} kcal over</span>
            ) : (
              <span>{remaining} kcal left</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
