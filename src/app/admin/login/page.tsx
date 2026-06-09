'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.refresh(); // Refresh middleware auth state
        router.push('/admin');
      } else {
        setError(data.error || 'Password yang Anda masukkan salah.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Terjadi kesalahan koneksi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0F172A] px-4 font-sans text-white">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[130px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-pink-600/10 blur-[130px]" />

      <div className="z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-md">
            <Lock className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Silakan masukkan password administrator untuk melanjutkan
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-950/35 px-4 py-3.5 text-xs text-red-400">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
                <span className="leading-normal font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                'Memverifikasi...'
              ) : (
                <>
                  <span>Masuk Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            ← Kembali ke Roda Keberuntungan
          </Link>
        </div>
      </div>
    </main>
  );
}
