'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpErr) throw signUpErr;
        setMessage('Registration successful! Redirecting...');
        setTimeout(() => router.push('/'), 1000);
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    router.push('/');
  };

  return (
    <div className="flex-1 flex flex-col justify-center p-6 pt-safe">
      <div className="w-full max-w-sm mx-auto">
        {/* Brand Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3 flex items-center justify-center">
            <div className="w-full h-full rounded-3xl bg-slate-950 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            NutriSnap AI
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Smart calorie & macro tracking from food photos
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          <h3 className="text-base font-bold text-white mb-4">
            {isSignUp ? 'Create an Account' : 'Sign In'}
          </h3>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3.5">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                'Processing...'
              ) : isSignUp ? (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Sign Up */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-emerald-400 hover:underline"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up Free"}
            </button>
          </div>
        </div>

        {/* Guest Mode fallback */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGuestContinue}
            className="flex items-center justify-center gap-1.5 mx-auto text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <UserCheck className="w-4 h-4" />
            <span>Continue as Guest</span>
          </button>
        </div>
      </div>
    </div>
  );
}
