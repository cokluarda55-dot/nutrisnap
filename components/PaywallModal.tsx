'use client';

import { useState } from 'react';
import { Sparkles, CheckCircle2, X, Crown, Loader2 } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const benefits = [
    'Unlimited Gemini AI food & macro scans',
    'Accurate Protein, Carbs & Fat portion breakdown',
    'Customized daily calorie and macro target tracking',
    'Complete nutrition history and timeline logs',
    'Ad-free, ultra-fast mobile PWA experience',
  ];

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Unable to start checkout session.');
      }

      // Redirect to Polar Hosted Checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to open checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 text-center shadow-2xl shadow-emerald-950/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Crown Badge */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
          <Crown className="w-8 h-8 text-amber-400" />
        </div>

        <h3 className="text-xl font-bold text-white">
          3 Free Scans Completed!
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          Unlock unlimited AI meal analysis with NutriSnap Pro.
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left">
            {error}
          </div>
        )}

        {/* Feature List */}
        <div className="space-y-2.5 text-left mb-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300 font-medium">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Pricing Box */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 mb-5">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-3xl font-extrabold text-white">$9.99</span>
            <span className="text-xs text-slate-400 font-normal">/ month</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
            Cancel anytime with 1 click
          </p>
        </div>

        {/* Upgrade Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to Checkout...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to NutriSnap Pro</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-slate-500 mt-3">
          Global payments processed securely by Polar (Cards, Apple Pay, Google Pay).
        </p>
      </div>
    </div>
  );
}
