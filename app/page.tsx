'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Camera, Sparkles, Plus, Trash2, Utensils, Crown, Sliders } from 'lucide-react';
import CalorieRing from '@/components/CalorieRing';
import MacroBar from '@/components/MacroBar';
import PaywallModal from '@/components/PaywallModal';
import GoalsModal from '@/components/GoalsModal';
import { createClient } from '@/lib/supabase/client';
import { Meal, Profile } from '@/lib/types';

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Fetch profile
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (prof) {
          setProfile(prof);
        }

        // Fetch today's meals
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data: mealData } = await supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .gte('consumed_at', startOfDay.toISOString())
          .order('consumed_at', { ascending: false });

        if (mealData) {
          setMeals(mealData as Meal[]);
        }
      } else {
        // Guest mode fallback
        const localMeals = localStorage.getItem('nutrisnap_guest_meals');
        if (localMeals) {
          setMeals(JSON.parse(localMeals));
        }
        const localCount = parseInt(localStorage.getItem('nutrisnap_guest_count') || '0', 10);
        const storedGoals = JSON.parse(
          localStorage.getItem('nutrisnap_guest_goals') ||
            '{"calories": 2000, "protein": 140, "carbs": 220, "fat": 65}'
        );

        setProfile({
          id: 'guest',
          email: null,
          daily_calorie_target: storedGoals.calories,
          daily_protein_target: storedGoals.protein,
          daily_carbs_target: storedGoals.carbs,
          daily_fat_target: storedGoals.fat,
          analyses_count: localCount,
          is_pro: false,
        });
      }
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Listen for goals updated event
    const handleGoalsSync = (e: any) => {
      const updated = e.detail;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              daily_calorie_target: updated.calories,
              daily_protein_target: updated.protein,
              daily_carbs_target: updated.carbs,
              daily_fat_target: updated.fat,
            }
          : null
      );
    };

    window.addEventListener('nutrisnap_goals_updated', handleGoalsSync);
    return () => {
      window.removeEventListener('nutrisnap_goals_updated', handleGoalsSync);
    };
  }, [loadData]);

  const handleDeleteMeal = async (id: string) => {
    if (profile?.id === 'guest') {
      const updated = meals.filter((m) => m.id !== id);
      setMeals(updated);
      localStorage.setItem('nutrisnap_guest_meals', JSON.stringify(updated));
      return;
    }

    try {
      await supabase.from('meals').delete().eq('id', id);
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Meal deletion error:', err);
    }
  };

  const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const totalProtein = meals.reduce((acc, m) => acc + (m.protein || 0), 0);
  const totalCarbs = meals.reduce((acc, m) => acc + (m.carbs || 0), 0);
  const totalFat = meals.reduce((acc, m) => acc + (m.fat || 0), 0);

  const calorieTarget = profile?.daily_calorie_target || 2000;
  const proteinTarget = profile?.daily_protein_target || 140;
  const carbsTarget = profile?.daily_carbs_target || 220;
  const fatTarget = profile?.daily_fat_target || 65;

  const freeRemaining = profile?.is_pro
    ? 'Unlimited'
    : Math.max(0, 3 - (profile?.analyses_count || 0));

  return (
    <div className="flex-1 flex flex-col p-4 pt-safe">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              NutriSnap AI
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PWA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Free / Pro Quota Badge */}
        <button
          onClick={() => setShowPaywall(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all ${
            profile?.is_pro
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
              : 'bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:border-emerald-500/50'
          }`}
        >
          {profile?.is_pro ? (
            <>
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>PRO</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{freeRemaining}/3 Free Scans</span>
            </>
          )}
        </button>
      </header>

      {/* Hero Calorie Progress Gauge */}
      <section className="relative bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800/80 rounded-3xl p-3 mb-4 shadow-xl backdrop-blur-sm">
        {/* Quick Edit Targets Button */}
        <button
          type="button"
          onClick={() => setShowGoalsModal(true)}
          className="absolute top-3 right-3 z-30 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 text-xs font-semibold border border-slate-700/80 shadow-md transition active:scale-95 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>Edit Goals</span>
        </button>

        <CalorieRing consumed={totalCalories} target={calorieTarget} />

        {/* Macros Breakdown */}
        <div className="grid grid-cols-3 gap-2 px-1 pb-1">
          <MacroBar
            label="Protein"
            consumed={totalProtein}
            target={proteinTarget}
            color="protein"
          />
          <MacroBar
            label="Carbs"
            consumed={totalCarbs}
            target={carbsTarget}
            color="carbs"
          />
          <MacroBar
            label="Fat"
            consumed={totalFat}
            target={fatTarget}
            color="fat"
          />
        </div>
      </section>

      {/* Quick Scan Callout */}
      <Link
        href="/scan"
        className="w-full flex items-center justify-between p-4 mb-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Camera className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Snap Your Meal</h4>
            <p className="text-[11px] text-emerald-100">
              Gemini AI instantly calculates calories & macros
            </p>
          </div>
        </div>
        <Plus className="w-5 h-5 text-emerald-200" />
      </Link>

      {/* Meals Log for Today */}
      <section className="flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-emerald-400" />
            Today&apos;s Meals ({meals.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Total {totalCalories} kcal
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-slate-900/60 animate-pulse border border-slate-800"
              />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-3xl bg-slate-900/30 border border-dashed border-slate-800">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">No meals logged yet today</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Snap a photo or upload from your gallery to log calories in seconds.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {meal.calories}
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-slate-100 line-clamp-1">
                      {meal.meal_name}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="text-blue-400">P: {meal.protein}g</span>
                      <span>•</span>
                      <span className="text-amber-400">C: {meal.carbs}g</span>
                      <span>•</span>
                      <span className="text-rose-400">F: {meal.fat}g</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteMeal(meal.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />

      {/* Goals Modal */}
      <GoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        currentGoals={{
          calories: calorieTarget,
          protein: proteinTarget,
          carbs: carbsTarget,
          fat: fatTarget,
        }}
        onGoalsUpdated={(newGoals) => {
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  daily_calorie_target: newGoals.calories,
                  daily_protein_target: newGoals.protein,
                  daily_carbs_target: newGoals.carbs,
                  daily_fat_target: newGoals.fat,
                }
              : null
          );
        }}
      />
    </div>
  );
}
