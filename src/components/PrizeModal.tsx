'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, X, Frown } from 'lucide-react';

interface PrizeModalProps {
  isOpen: boolean;
  prizeName: string;
  prizeColor: string;
  isZonk: boolean;
  onClose: () => void;
}

export default function PrizeModal({
  isOpen,
  prizeName,
  prizeColor,
  isZonk,
  onClose,
}: PrizeModalProps) {
  const isNoWin = isZonk;

  useEffect(() => {
    if (isOpen && !isNoWin) {
      // Fire confetti when modal opens, only for REAL wins
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Confetti from two sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen, isNoWin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/90 p-8 text-center shadow-2xl transition-all duration-300 transform scale-100 animate-scale-up">
        {/* Decorative Top Accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-2" 
          style={{ backgroundColor: isNoWin ? '#475569' : prizeColor }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Icon (Sad Face for Zonk, Gift for Win) */}
        {isNoWin ? (
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/80 shadow-inner">
            <Frown 
              className="h-10 w-10 text-slate-400 animate-pulse" 
            />
          </div>
        ) : (
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/80 shadow-inner">
            <Gift 
              className="h-10 w-10 animate-bounce" 
              style={{ color: prizeColor }} 
            />
          </div>
        )}

        {/* Header/Subtitle Text */}
        <span className={`text-sm font-semibold uppercase tracking-widest ${isNoWin ? 'text-slate-400' : 'text-emerald-400 animate-pulse'}`}>
          {isNoWin ? 'Yah! Belum Beruntung' : 'Selamat! Kamu Menang'}
        </span>
        
        {/* Prize Name */}
        <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight leading-tight px-4">
          {prizeName}
        </h2>

        {/* Visual Swatch */}
        <div className="mt-6 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/50 px-4 py-2 text-xs text-slate-300">
            {isNoWin ? (
              <>
                <span className="h-3 w-3 rounded-full bg-slate-500" />
                <span>Coba keberuntunganmu lagi!</span>
              </>
            ) : (
              <>
                <span 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: prizeColor }}
                />
                <span>Hadiah Spesial</span>
              </>
            )}
          </div>
        </div>

        {/* Close/Action Button */}
        <button
          onClick={onClose}
          className={`mt-8 w-full rounded-xl py-3.5 font-bold text-white shadow-lg focus:outline-none focus:ring-2 active:scale-[0.98] transition-all ${
            isNoWin 
              ? 'bg-gradient-to-r from-slate-600 to-slate-700 shadow-slate-950/20 hover:from-slate-500 hover:to-slate-600 focus:ring-slate-500/50'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 focus:ring-emerald-500/50'
          }`}
        >
          {isNoWin ? 'Coba Lagi' : 'Ambil Hadiah / Putar Lagi'}
        </button>
      </div>
    </div>
  );
}
