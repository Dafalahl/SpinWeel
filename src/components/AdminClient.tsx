'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Trash2, 
  Save, 
  Undo, 
  LogOut, 
  Eye, 
  BarChart3, 
  Coins, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface Prize {
  id: string;
  name: string;
  color: string;
  probability: number;
  stock: number | null;
  stock_used: number;
  is_zonk: boolean;
  active: boolean;
  created_at?: string;
}

interface WinStat {
  prize_name: string;
  win_count: number;
}

interface AdminClientProps {
  initialPrizes: Prize[];
  totalSpins: number;
  winStats: WinStat[];
  initialSettings: {
    force_lose: boolean;
  };
}

export default function AdminClient({
  initialPrizes,
  totalSpins,
  winStats,
  initialSettings,
}: AdminClientProps) {
  const router = useRouter();
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Global Settings States
  const [settings, setSettings] = useState({
    force_lose: initialSettings?.force_lose || false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan pengaturan.');
      }

      setSettingsSuccess(true);
      router.refresh();
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setSettingsError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Map win stats by prize name for quick lookup
  const winStatsMap = useMemo(() => {
    const map: Record<string, number> = {};
    winStats.forEach((stat) => {
      map[stat.prize_name] = stat.win_count;
    });
    return map;
  }, [winStats]);

  // Calculate total probability of ACTIVE prizes in state
  const activeProbabilitySum = useMemo(() => {
    const sum = prizes
      .filter((p) => p.active)
      .reduce((acc, p) => acc + Number(p.probability || 0), 0);
    // Return rounded to 2 decimal places to handle float precision issues
    return Math.round(sum * 100) / 100;
  }, [prizes]);

  const isValidProbability = activeProbabilitySum === 100;

  // Track if state is modified compared to initial
  const isModified = useMemo(() => {
    if (deletedIds.length > 0) return true;
    if (prizes.length !== initialPrizes.length) return true;

    for (let i = 0; i < prizes.length; i++) {
      const p = prizes[i];
      const initP = initialPrizes.find((ip) => ip.id === p.id);
      if (!initP) return true; // Added item
      if (
        p.name !== initP.name ||
        p.color !== initP.color ||
        Number(p.probability) !== Number(initP.probability) ||
        p.stock !== initP.stock ||
        p.is_zonk !== initP.is_zonk ||
        p.active !== initP.active
      ) {
        return true;
      }
    }
    return false;
  }, [prizes, initialPrizes, deletedIds]);

  const handleAddPrize = () => {
    const newPrize: Prize = {
      id: `temp-${Date.now()}`,
      name: 'Hadiah Baru',
      color: '#3B82F6',
      probability: 0,
      stock: null,
      stock_used: 0,
      is_zonk: false,
      active: true,
    };
    setPrizes([...prizes, newPrize]);
    setSaveSuccess(false);
  };

  const handleDeletePrize = (id: string) => {
    setPrizes(prizes.filter((p) => p.id !== id));
    if (!id.startsWith('temp-')) {
      setDeletedIds([...deletedIds, id]);
    }
    setSaveSuccess(false);
  };

  const handleFieldChange = (id: string, field: keyof Prize, value: Prize[keyof Prize]) => {
    setPrizes(
      prizes.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
    setSaveSuccess(false);
  };

  const handleReset = () => {
    setPrizes(initialPrizes);
    setDeletedIds([]);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!isValidProbability) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/admin/prizes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upserts: prizes,
          deletes: deletedIds,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSaveSuccess(true);
        setDeletedIds([]);
        router.refresh(); // Reload server data to fetch fresh list & reset modification state
      } else {
        setSaveError(data.error || 'Gagal menyimpan perubahan.');
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveError('Terjadi kesalahan koneksi server.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/admin/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <main className="min-h-screen bg-[#090D1A] font-sans text-slate-100 pb-20">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-40 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md">
              <Settings className="h-5 w-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Roda Keberuntungan</h1>
              <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                Panel Kontrol Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>Lihat Roda</span>
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-red-950/40 border border-red-900/30 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Analytics & Stats */}
        <div className="lg:col-span-1 space-y-8">
          {/* Card 1: Total Spins */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="h-24 w-24 text-indigo-500" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Putaran
            </span>
            <h3 className="mt-2 text-4xl font-extrabold text-white tracking-tight">
              {totalSpins.toLocaleString()}
            </h3>
            <p className="mt-2 text-xs text-indigo-400 font-medium flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Akumulasi putaran pengguna</span>
            </p>
          </div>

          {/* Card 2: Prizes Stats Breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-400" />
                <span>Statistik Pemenang</span>
              </h4>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                {initialPrizes.length} Hadiah
              </span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {initialPrizes.map((prize) => {
                const wins = winStatsMap[prize.name] || 0;
                const winPercentage = totalSpins > 0 ? (wins / totalSpins) * 100 : 0;

                return (
                  <div key={prize.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: prize.color }}
                        />
                        <span className="truncate text-slate-300">{prize.name}</span>
                      </div>
                      <span className="text-slate-400 font-bold">
                        {wins}x ({winPercentage.toFixed(1)}%)
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${winPercentage}%`,
                          backgroundColor: prize.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {initialPrizes.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">
                  Belum ada data statistik pemenang.
                </p>
              )}
            </div>
          </div>
          
          {/* Card 3: Global Settings */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3">
              <Settings className="h-4 w-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-slate-200">
                Pengaturan Stand
              </h4>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              {/* Force Zonk Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-semibold text-slate-300 block">
                    Mode Paksa Zonk (Kalah)
                  </label>
                  <span className="text-[10px] text-slate-500 block max-w-[140px] leading-relaxed mt-0.5">
                    Jika aktif, semua putaran otomatis menghasilkan Zonk.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(s => ({ ...s, force_lose: !s.force_lose }))}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                    settings.force_lose ? 'bg-rose-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.force_lose ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settingsError && (
                <div className="text-[10px] font-semibold text-rose-400 bg-rose-950/30 border border-rose-500/15 rounded-lg p-2">
                  {settingsError}
                </div>
              )}

              {settingsSuccess && (
                <div className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-500/15 rounded-lg p-2">
                  Pengaturan berhasil disimpan!
                </div>
              )}

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-indigo-600/15 hover:bg-indigo-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Prizes CRUD Table */}
        <div className="lg:col-span-3 space-y-6">
          {/* Validation Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 shadow-xl">
            <div className="flex items-start gap-3.5">
              {isValidProbability ? (
                <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : (
                <div className="mt-0.5 rounded-full bg-amber-500/10 p-2 border border-amber-500/20 text-amber-400">
                  <AlertCircle className="h-6 w-6" />
                </div>
              )}
              
              <div>
                <h4 className="font-extrabold text-base leading-tight">
                  Status Probabilitas Hadiah Aktif
                </h4>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Total Saat Ini:</span>
                  <span className={`font-black ${isValidProbability ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeProbabilitySum}%
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">Harus Tepat:</span>
                  <span className="font-bold text-white">100%</span>
                </div>
                {!isValidProbability && (
                  <p className="mt-1 text-xs text-amber-500/90 font-medium">
                    ⚠️ Anda tidak dapat menyimpan perubahan karena total probabilitas hadiah aktif tidak bernilai 100%.
                  </p>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 self-end md:self-center">
              {isModified && (
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-2.5 text-xs font-bold hover:bg-slate-800 transition-all"
                >
                  <Undo className="h-4 w-4" />
                  <span>Batalkan</span>
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !isValidProbability || !isModified}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md ${
                  saving || !isValidProbability || !isModified
                    ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:scale-[1.02]'
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {saveError && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3.5 text-xs text-red-400 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
          {saveSuccess && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-4 py-3.5 text-xs text-emerald-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Semua perubahan berhasil disimpan ke database!</span>
            </div>
          )}

          {/* Prizes Table Container */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-6">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                <h4 className="font-extrabold text-sm text-slate-200">
                  Daftar Pengaturan Hadiah
                </h4>
              </div>
              <button
                onClick={handleAddPrize}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Hadiah</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/35 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6 text-center w-[80px]">Aktif</th>
                    <th className="py-4 px-6 text-center w-[90px]">Zonk / Kalah</th>
                    <th className="py-4 px-4 min-w-[260px]">Nama Hadiah</th>
                    <th className="py-4 px-4 w-[110px]">Warna Segmen</th>
                    <th className="py-4 px-4 w-[100px]">Probabilitas (%)</th>
                    <th className="py-4 px-4 w-[110px]">Stok (Limit)</th>
                    <th className="py-4 px-4 w-[80px] text-center">Terpakai</th>
                    <th className="py-4 px-6 text-center w-[70px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {prizes.map((prize) => (
                    <tr 
                      key={prize.id} 
                      className={`hover:bg-slate-900/20 transition-colors ${
                        !prize.active ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Active Status Toggle */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(prize.id, 'active', !prize.active)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                            prize.active ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              prize.active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Zonk / Kalah Toggle */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleFieldChange(prize.id, 'is_zonk', !prize.is_zonk)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                            prize.is_zonk ? 'bg-rose-600' : 'bg-slate-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              prize.is_zonk ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Prize Name Input */}
                      <td className="py-4 px-4 min-w-[260px]">
                        <input
                          type="text"
                          required
                          value={prize.name}
                          onChange={(e) => handleFieldChange(prize.id, 'name', e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 transition-all text-white"
                          placeholder="Nama Hadiah"
                        />
                      </td>

                      {/* Color Swatch & Hex Input */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 cursor-pointer shrink-0">
                            <input
                              type="color"
                              value={prize.color}
                              onChange={(e) => handleFieldChange(prize.id, 'color', e.target.value)}
                              className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                            />
                          </div>
                          <input
                            type="text"
                            required
                            maxLength={7}
                            value={prize.color}
                            onChange={(e) => handleFieldChange(prize.id, 'color', e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-2 py-2 text-[10px] font-mono outline-none focus:border-indigo-500 transition-all text-white"
                          />
                        </div>
                      </td>

                      {/* Probability Percentage Input */}
                      <td className="py-4 px-4">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            required
                            min={0}
                            max={100}
                            step="any"
                            value={prize.probability}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                              handleFieldChange(prize.id, 'probability', isNaN(val) ? 0 : val);
                            }}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-3 pr-7 py-2 text-xs font-bold outline-none focus:border-indigo-500 transition-all text-white"
                          />
                          <span className="absolute right-3 text-[10px] font-bold text-slate-500">%</span>
                        </div>
                      </td>

                      {/* Stock Cap (Null = Unlimited) */}
                      <td className="py-4 px-4">
                        <input
                          type="number"
                          min={0}
                          value={prize.stock === null ? '' : prize.stock}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            handleFieldChange(prize.id, 'stock', val);
                          }}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs outline-none focus:border-indigo-500 transition-all text-white placeholder-slate-600 font-medium"
                          placeholder="Unlimited (∞)"
                        />
                      </td>

                      {/* Stock Used Count */}
                      <td className="py-4 px-4 text-center">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {prize.stock_used || 0}
                        </span>
                      </td>

                      {/* Action Deletion */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(prize.id)}
                          className="rounded-lg p-1.5 text-slate-500 border border-transparent hover:border-red-900/30 hover:bg-red-950/20 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {prizes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-500 font-medium">
                        Tidak ada hadiah terdaftar. Silakan klik &quot;Tambah Hadiah&quot; untuk membuat yang baru.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
