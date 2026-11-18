'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Crown,
  LogOut,
  Sparkles,
  Check,
  LogIn,
  Sliders,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import PaywallModal from '@/components/PaywallModal';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [proteinTarget, setProteinTarget] = useState(140);
  const [carbsTarget, setCarbsTarget] = useState(220);
  const [fatTarget, setFatTarget] = useState(65);
  const [message, setMessage] = useState<string | null>(null);

  // VIP Promo state
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (data) {
            setProfile(data);
            setCalorieTarget(data.daily_calorie_target);
            setProteinTarget(data.daily_protein_target);
            setCarbsTarget(data.daily_carbs_target);
            setFatTarget(data.daily_fat_target);
          }
        } else {
          // Guest mode
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
          setCalorieTarget(storedGoals.calories);
          setProteinTarget(storedGoals.protein);
          setCarbsTarget(storedGoals.carbs);
          setFatTarget(storedGoals.fat);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase]);

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const newGoals = {
      calories: Number(calorieTarget),
      protein: Number(proteinTarget),
      carbs: Number(carbsTarget),
      fat: Number(fatTarget),
    };

    try {
      localStorage.setItem('nutrisnap_guest_goals', JSON.stringify(newGoals));
      localStorage.setItem('nutrisnap_goals', JSON.stringify(newGoals));

      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoals),
      });

      window.dispatchEvent(new CustomEvent('nutrisnap_goals_updated', { detail: newGoals }));
      setMessage('Nutrition goals updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage('Error updating targets.');
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch('/api/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.open('https://polar.sh/purchases/subscriptions', '_blank');
      }
    } catch (err) {
      console.error(err);
      window.open('https://polar.sh/purchases/subscriptions', '_blank');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleRedeemPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      setPromoLoading(true);
      setPromoMessage(null);

      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim() }),
      });

      const data = await res.json();

      if (res.status === 401 && data.error === 'AUTH_REQUIRED') {
        const VALID_PROMO_CODES = ['VIP2026', 'PROTEST', 'NUTRIFRIEND', 'BETA2026', 'ARTECH'];
        if (VALID_PROMO_CODES.includes(promoCode.trim().toUpperCase())) {
          localStorage.setItem('nutrisnap_guest_is_pro', 'true');
          setPromoMessage('🎉 VIP mode unlocked for guest! Unlimited scans active.');
          setTimeout(() => window.location.reload(), 1200);
          return;
        }
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate VIP code.');
      }

      setPromoMessage('🎉 NutriSnap Pro VIP activated! Unlimited scans unlocked.');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setPromoMessage(`❌ ${err?.message || 'Error activating code'}`);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex-1 flex flex-col p-4 pt-safe pb-28">
      {/* Header */}
      <header className="flex items-center justify-between py-2 mb-4">
        <h2 className="font-bold text-lg text-slate-200">Profile & Settings</h2>
      </header>

      {/* Subscription Card */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800/90 border border-slate-700/60 rounded-3xl p-5 mb-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                {profile?.email || 'Guest User'}
              </h4>
              <p className="text-xs text-slate-400">
                {profile?.is_pro ? 'NutriSnap Pro Member' : 'Free Tier'}
              </p>
            </div>
          </div>

          {profile?.is_pro ? (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <Crown className="w-3.5 h-3.5" /> PRO
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {profile?.analyses_count || 0}/3 Used
            </span>
          )}
        </div>

        {profile?.is_pro ? (
          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs transition"
          >
            {portalLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            <span>Manage Subscription (Polar Portal)</span>
          </button>
        ) : (
          <div className="space-y-2 mt-2">
            <button
              onClick={() => setShowPaywall(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Pro ($9.99/mo)
            </button>

            {/* VIP Tester Redeem Button / Drawer */}
            <div className="pt-2 border-t border-slate-800/80 text-center">
              {!showPromo ? (
                <button
                  type="button"
                  onClick={() => setShowPromo(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline underline-offset-4 transition"
                >
                  Have a VIP Tester Code?
                </button>
              ) : (
                <div className="space-y-2 text-left pt-1">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Enter tester code to unlock unlimited access:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. VIP2026"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white uppercase placeholder-slate-600 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleRedeemPromo}
                      disabled={promoLoading || !promoCode.trim()}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-50"
                    >
                      {promoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                    </button>
                  </div>
                  {promoMessage && (
                    <p className="text-[11px] font-medium text-emerald-400 mt-1">
                      {promoMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Daily Goals Editor Form */}
      <form onSubmit={handleSaveTargets} className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 space-y-4 mb-5 shadow-lg">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Daily Nutrition Goals
        </h4>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            {message}
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1">
            Daily Calorie Target (kcal)
          </label>
          <input
            type="number"
            value={calorieTarget}
            onChange={(e) => setCalorieTarget(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] text-blue-400 font-medium block mb-1">
              Protein (g)
            </label>
            <input
              type="number"
              value={proteinTarget}
              onChange={(e) => setProteinTarget(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-amber-400 font-medium block mb-1">
              Carbs (g)
            </label>
            <input
              type="number"
              value={carbsTarget}
              onChange={(e) => setCarbsTarget(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-rose-400 font-medium block mb-1">
              Fat (g)
            </label>
            <input
              type="number"
              value={fatTarget}
              onChange={(e) => setFatTarget(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          {saving ? 'Saving...' : 'Save Goals'}
        </button>
      </form>

      {/* Auth Actions */}
      <div className="mt-auto pt-4">
        {profile?.id !== 'guest' ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition"
          >
            <LogIn className="w-4 h-4" />
            Sign In or Create Account
          </button>
        )}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </div>
  );
}
