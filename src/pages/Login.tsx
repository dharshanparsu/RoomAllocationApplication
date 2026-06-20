import { useState } from 'react';
import { Hotel, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export function Login() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! An admin will approve your access shortly.');
        setEmail('');
        setPassword('');
        setMode('signin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50/60 to-white">
      <div className="mb-6 w-[72px] h-[72px] bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40">
        <Hotel className="w-9 h-9 text-white" />
      </div>

      <h1 className="text-[28px] font-bold text-gray-900 mb-1 tracking-tight">Room Allocation</h1>
      <p className="text-gray-400 text-center mb-8 text-[15px]">
        Dharshan &amp; Amulya · 05 Jul 2026
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-3">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={inputCls}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className={`${inputCls} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {error && (
        <div className="mt-4 w-full max-w-xs p-3.5 bg-red-50 rounded-2xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 w-full max-w-xs p-3.5 bg-green-50 rounded-2xl text-green-700 text-sm">
          {success}
        </div>
      )}

      <button
        onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null); }}
        className="mt-6 text-sm text-blue-600 hover:underline"
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
