'use client';

import { useState, useEffect } from 'react';
import { X, Check, Sliders, Flame } from 'lucide-react';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onGoalsUpdated?: (newGoals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}

export default function GoalsModal({
  isOpen,
  onClose,
  currentGoals,
  onGoalsUpdated,
}: GoalsModalProps) {
  const [calorieTarget, setCalorieTarget] = useState(currentGoals.calories || 2000);
  const [proteinTarget, setProteinTarget] = useState(currentGoals.protein || 140);
  const [carbsTarget, setCarbsTarget] = useState(currentGoals.carbs || 220);
  const [fatTarget, setFatTarget] = useState(currentGoals.fat || 65);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCalorieTarget(currentGoals.calories || 2000);
      setProteinTarget(currentGoals.protein || 140);
      setCarbsTarget(currentGoals.carbs || 220);
      setFatTarget(currentGoals.fat || 65);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, currentGoals]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const newGoals = {
      calories: Number(calorieTarget) || 2000,
      protein: Number(proteinTarget) || 140,
      carbs: Number(carbsTarget) || 220,
      fat: Number(fatTarget) || 65,
    };

    try {
      // 1. Store in localStorage as instant client backup
      localStorage.setItem('nutrisnap_guest_goals', JSON.stringify(newGoals));
      localStorage.setItem('nutrisnap_goals', JSON.stringify(newGoals));

      // 2. Persist to Supabase database via resilient server API
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoals),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('Goals API warning:', errData);
      }

      // 3. Notify parent component & broadcast to all pages
      if (onGoalsUpdated) {
        onGoalsUpdated(newGoals);
      }
      window.dispatchEvent(new CustomEvent('nutrisnap_goals_updated', { detail: newGoals }));

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Failed to update nutrition targets:', err);
      setError(err?.message || 'Error saving goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-5 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Daily Targets</h3>
            <p className="text-[11px] text-slate-400">Adjust your calorie & macro goals</p>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          {/* Calorie Goal */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-emerald-400" />
                Daily Calories (kcal)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="800"
                  max="8000"
                  step="25"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(Number(e.target.value))}
                  className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white text-center font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 font-semibold">kcal</span>
              </div>
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="50"
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>1000 kcal</span>
              <span>5000 kcal</span>
            </div>
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-3 gap-2">
            {/* Protein */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5">
              <label className="text-[11px] font-semibold text-blue-400 block mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                min="20"
                max="500"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Carbs */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5">
              <label className="text-[11px] font-semibold text-amber-400 block mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                min="10"
                max="700"
                value={carbsTarget}
                onChange={(e) => setCarbsTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Fat */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5">
              <label className="text-[11px] font-semibold text-rose-400 block mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={fatTarget}
                onChange={(e) => setFatTarget(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white text-center font-bold focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            {success ? (
              <>
                <Check className="w-4 h-4" />
                <span>Goals Saved!</span>
              </>
            ) : saving ? (
              <span>Saving...</span>
            ) : (
              <span>Save Targets</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
