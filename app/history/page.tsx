'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Meal } from '@/lib/types';

export default function HistoryPage() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchMeals() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .order('consumed_at', { ascending: false });

          if (data) setMeals(data as Meal[]);
        } else {
          const guestMeals = localStorage.getItem('nutrisnap_guest_meals');
          if (guestMeals) setMeals(JSON.parse(guestMeals));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchMeals();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('meals').delete().eq('id', id);
      } else {
        const updated = meals.filter((m) => m.id !== id);
        localStorage.setItem('nutrisnap_guest_meals', JSON.stringify(updated));
      }
      setMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Group meals by date (US format)
  const groupedMeals = meals.reduce((groups, meal) => {
    const dateKey = new Date(meal.consumed_at).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(meal);
    return groups;
  }, {} as Record<string, Meal[]>);

  return (
    <div className="flex-1 flex flex-col p-4 pt-safe pb-28">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 text-slate-400 hover:text-white rounded-2xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-base text-slate-200">Meal History</h2>
        <div className="w-9" />
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : Object.keys(groupedMeals).length === 0 ? (
        <div className="text-center py-16 px-4">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-300">No meal logs yet</h4>
          <p className="text-xs text-slate-500 mt-1">
            Meals you snap and log will be organized by date here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMeals).map(([date, dayMeals]) => {
            const dayCalories = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {date}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {dayCalories} kcal
                  </span>
                </div>

                <div className="space-y-2">
                  {dayMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          {meal.calories}
                        </div>
                        <div>
                          <h5 className="font-semibold text-sm text-slate-200 line-clamp-1">
                            {meal.meal_name}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>P: {meal.protein}g</span>
                            <span>•</span>
                            <span>C: {meal.carbs}g</span>
                            <span>•</span>
                            <span>F: {meal.fat}g</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(meal.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
