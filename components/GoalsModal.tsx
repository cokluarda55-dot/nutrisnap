'use client';

import { useState, useEffect } from 'react';
import { X, Target, Check, Sliders, Flame } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setCalorieTarget(currentGoals.calories || 2000);
      setProteinTarget(currentGoals.protein || 140);
      setCarbsTarget(currentGoals.carbs || 220);
      setFatTarget(currentGoals.fat || 65);
      setSuccess(false);
    }
  }, [isOpen, currentGoals]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const newGoals = {
      calories: Number(calorieTarget),
      protein: Number(proteinTarget),
      carbs: Number(carbsTarget),
      fat: Number(fatTarget),
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('profiles')
          .update({
            daily_calorie_target: newGoals.calories,
            daily_protein_target: newGoals.protein,
            daily_carbs_target: newGoals.carbs,
            daily_fat_target: newGoals.fat,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } else {
        localStorage.setItem('nutrisnap_guest_goals', JSON.stringify(newGoals));
      }

      // Notify parent & global event
      if (onGoalsUpdated) {
        onGoalsUpdated(newGoals);
      }
      window.dispatchEvent(new CustomEvent('nutrisnap_goals_updated', { detail: newGoals }));

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to update nutrition targets:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-5 shadow-2xl">
        <button
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

        <form onSubmit={handleSave} className="space-y-4 mt-4">
          {/* Calorie Goal */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-emerald-400" />
                Daily Calories (kcal)
              </label>
              <span className="text-sm font-extrabold text-emerald-400">
                {calorieTarget} kcal
              </span>
            </div>
            <input
              type="range"
              min="1200"
              max="4500"
              step="50"
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>1200 kcal</span>
              <span>4500 kcal</span>
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
                min="30"
                max="400"
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
                min="20"
                max="600"
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
                min="15"
                max="250"
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
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
          >
            {success ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
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
