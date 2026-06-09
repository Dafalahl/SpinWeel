'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import SpinWheel from './SpinWheel';
import PrizeModal from './PrizeModal';

interface Prize {
  id: string;
  name: string;
  color: string;
  is_zonk: boolean;
}

interface HomeClientProps {
  initialPrizes: Prize[];
}

export default function HomeClient({ initialPrizes }: HomeClientProps) {
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [wonPrize, setWonPrize] = useState<{ name: string; color: string; is_zonk: boolean } | null>(null);

  const handleSpinClick = React.useCallback(async () => {
    if (isSpinning || prizes.length === 0) return;

    setError(null);
    setIsSpinning(true);
    setWinningIndex(null);

    try {
      const response = await fetch('/api/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal memproses putaran.');
      }

      const result = await response.json(); // { prize_name, color, is_zonk }

      // Find the index of the won prize in our local array
      const index = prizes.findIndex((p) => p.name === result.prize_name);
      
      if (index !== -1) {
        setWonPrize({ name: result.prize_name, color: result.color || '#3B82F6', is_zonk: result.is_zonk });
        setWinningIndex(index);
      } else {
        // If the prize returned by the server is not in the list (e.g. added recently),
        // we append it temporarily so the wheel can spin to it.
        const newPrize: Prize = {
          id: 'temp',
          name: result.prize_name,
          color: result.color || '#3B82F6',
          is_zonk: result.is_zonk,
        };
        const updatedPrizes = [...prizes, newPrize];
        setPrizes(updatedPrizes);
        setWonPrize({ name: result.prize_name, color: result.color || '#3B82F6', is_zonk: result.is_zonk });
        setWinningIndex(updatedPrizes.length - 1);
      }
    } catch (err) {
      console.error('Spin error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
      setError(errorMessage);
      setIsSpinning(false);
    }
  }, [isSpinning, prizes]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        // Trigger spin if eligible
        if (!isSpinning && !modalOpen && prizes.length > 0) {
          handleSpinClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpinning, modalOpen, prizes.length, handleSpinClick]);

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setWinningIndex(null);
    setWonPrize(null);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0F19] py-12 px-6 lg:px-12 font-sans text-white">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[140px]" />

      {/* Grid Layout */}
      <div className="z-10 w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Brand, Description, Prizes list, and Action Button (col-span-4) */}
        <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-slate-100 via-white to-slate-200 bg-clip-text text-transparent">
                SpinWeel
              </span>{' '}
              <span>🤘</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              Putar rodanya dan dapatkan hadiah menarik! coba keberuntunganmu sekarang juga.
            </p>
          </div>

          {/* Prizes list WITHOUT probabilities */}
          {prizes.length > 0 && (
            <div className="w-full rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 shadow-xl space-y-4">
              <h4 className="font-extrabold text-sm text-indigo-400 uppercase tracking-wider">
                Daftar Hadiah Tersedia
              </h4>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2">
                {prizes.map((prize) => (
                   <div key={prize.id} className="flex items-center gap-3">
                     <span
                       className="h-3.5 w-3.5 rounded-full shrink-0 shadow-md border border-white/10"
                       style={{ backgroundColor: prize.color }}
                     />
                     <span className="text-sm font-semibold text-slate-200">
                       {prize.name} {prize.is_zonk && <span className="text-[10px] text-slate-500 font-normal">(Zonk)</span>}
                     </span>
                   </div>
                ))}
              </div>
            </div>
          )}

          {/* Spin Button */}
          <div className="w-full flex flex-col items-center lg:items-stretch gap-3">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-950/40 px-4 py-3.5 text-xs font-semibold text-red-400 text-center">
                {error}
              </div>
            )}

            {prizes.length > 0 && (
              <div className="w-full space-y-2">
                <button
                  onClick={() => handleSpinClick()}
                  disabled={isSpinning || modalOpen}
                  className={`w-full rounded-2xl py-4 font-extrabold text-lg tracking-wide uppercase transition-all duration-300 transform shadow-xl ${
                    isSpinning || modalOpen
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed scale-95 shadow-none'
                      : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-indigo-500/25 hover:opacity-95 hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]'
                  }`}
                >
                  {isSpinning ? 'Memutar...' : 'Putar Sekarang'}
                </button>
                <p className="hidden lg:block text-center text-xs text-slate-500 font-semibold">
                  Atau tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px]">SPASI</kbd> di keyboard Anda
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Massive Spin Wheel (col-span-8) */}
        <div className="lg:col-span-8 flex justify-center items-center w-full">
          {prizes.length > 0 ? (
            <SpinWheel
              prizes={prizes}
              winningIndex={winningIndex}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/40 p-12 text-slate-400 w-full max-w-[400px]">
              <HelpCircle className="h-12 w-12 text-slate-500 mb-4" />
               <p className="text-center font-medium">Belum ada hadiah aktif.</p>
               <p className="text-xs text-slate-500 mt-1 text-center">
                 Hubungi admin untuk mengisi daftar hadiah terlebih dahulu.
               </p>
            </div>
          )}
        </div>

      </div>

      {/* Winner Modal Popup */}
      <PrizeModal
        isOpen={modalOpen}
        prizeName={wonPrize?.name || ''}
        prizeColor={wonPrize?.color || '#10B981'}
        isZonk={wonPrize?.is_zonk || false}
        onClose={handleCloseModal}
      />


    </main>
  );
}
