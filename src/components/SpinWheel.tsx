'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface Prize {
  id: string;
  name: string;
  color: string;
}

interface SpinWheelProps {
  prizes: Prize[];
  winningIndex: number | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
}

export default function SpinWheel({
  prizes,
  winningIndex,
  isSpinning,
  onSpinComplete,
}: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Animation states
  const animationRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0); // Current rotation angle in radians
  const lastSegmentIndex = useRef<number>(0);
  
  // Initialize Audio Context on first interaction
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Synthesis of a realistic mechanical tick sound
  const playTickSound = () => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      console.error('Failed to play synthesized tick:', e);
    }
  };

  // Draw the wheel onto the canvas
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 800; // Logical size for high-DPI scaling
    const center = size / 2;
    const radius = center - 20;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const numSegments = prizes.length;
    if (numSegments === 0) return;
    
    const anglePerSegment = (2 * Math.PI) / numSegments;

    // Save context for wheel rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);

    // 1. Draw segment slices and labels
    for (let i = 0; i < numSegments; i++) {
      const prize = prizes[i];
      const startAngle = i * anglePerSegment;
      const endAngle = (i + 1) * anglePerSegment;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Draw light border between segments
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text label inside slice
      ctx.save();
      const textAngle = startAngle + anglePerSegment / 2;
      ctx.rotate(textAngle);

      // Positioning text
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      
      // Determine font size based on number of segments
      const fontSize = numSegments > 10 ? 12 : 16;
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      // Shadow for text readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Draw text near the outer edge
      const textX = radius - 30;
      ctx.fillText(prize.name, textX, 0);
      ctx.restore();
    }

    // 2. Draw outer border ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#1E293B'; // Slate 800
    ctx.lineWidth = 10;
    ctx.stroke();

    // 3. Draw outer glowing lights/bulbs
    const numBulbs = numSegments * 2;
    for (let i = 0; i < numBulbs; i++) {
      const bulbAngle = (i * (2 * Math.PI)) / numBulbs;
      const bulbX = (radius + 5) * Math.cos(bulbAngle);
      const bulbY = (radius + 5) * Math.sin(bulbAngle);

      ctx.beginPath();
      ctx.arc(bulbX, bulbY, 4, 0, 2 * Math.PI);
      
      // Alternate blinking light colors
      const isGlowing = Math.floor(Date.now() / 300) % 2 === i % 2;
      ctx.fillStyle = isGlowing ? '#FDE047' : '#94A3B8'; // Bright Yellow vs Muted Gray
      ctx.shadowColor = isGlowing ? '#FDE047' : 'transparent';
      ctx.shadowBlur = isGlowing ? 8 : 0;
      ctx.fill();
    }
    
    ctx.restore(); // Restore context to default (no rotation)

    // 4. Draw Center Pin
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#0F172A'; // Slate 900
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent'; // Reset shadow

    // Center logo text or graphic
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', center, center);

    // 5. Draw Pointer (at the top, pointing down)
    ctx.beginPath();
    ctx.moveTo(center - 18, 15);
    ctx.lineTo(center + 18, 15);
    ctx.lineTo(center, 40);
    ctx.closePath();
    
    ctx.fillStyle = '#EF4444'; // Red 500
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent'; // Reset shadow
  }, [prizes]);

  // Run the canvas redraw loop
  useEffect(() => {
    drawWheel(angleRef.current);
    
    // Constant light blinking animation while not spinning
    let intervalId: NodeJS.Timeout;
    if (!isSpinning) {
      intervalId = setInterval(() => {
        drawWheel(angleRef.current);
      }, 300);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSpinning, drawWheel]);

  // Handle the spin trigger
  useEffect(() => {
    if (winningIndex === null || !isSpinning) return;

    initAudio();

    const duration = 6500; // 6.5 seconds – faster but still smooth
    const startRotation = angleRef.current % (2 * Math.PI);
    const numSegments = prizes.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    // Calculate landing rotation (counter-clockwise / berlawanan jarum jam):
    // Pointer is at the top (3/2 * PI). We want the winning segment to align with it.
    // Randomize where in the segment it lands (between 15% and 85%) for visual realism.
    const randomOffset = 0.15 + Math.random() * 0.7;
    const targetSegmentLanding = (winningIndex + randomOffset) * anglePerSegment;

    // Calculate the base target angle for the winning segment to align under the pointer
    let baseTargetAngle = 1.5 * Math.PI - targetSegmentLanding;

    // Normalize so baseTargetAngle is strictly below startRotation (counter-clockwise = decreasing angle)
    while (baseTargetAngle >= startRotation) {
      baseTargetAngle -= 2 * Math.PI;
    }
    // Ensure at least one full revolution gap below startRotation
    while (baseTargetAngle > startRotation - 2 * Math.PI) {
      baseTargetAngle -= 2 * Math.PI;
    }

    // Add 15 full counter-clockwise rotations for higher peak speed (negative = CCW)
    const totalRotationTarget = baseTargetAngle - 2 * Math.PI * 15;
    const deltaRotation = totalRotationTarget - startRotation; // Always negative = counter-clockwise
    
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth ease-in-out-cubic: gradual acceleration then long smooth deceleration
      // First half: accelerate (cubic ease-in)
      // Second half: decelerate smoothly (cubic ease-out)
      const eased = progress < 0.5
        ? 4 * Math.pow(progress, 3)
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentAngle = startRotation + deltaRotation * eased;
      
      angleRef.current = currentAngle;

      // Exact boundary crossing tick sound detection
      const relativePointerAngle = (1.5 * Math.PI - currentAngle) % (2 * Math.PI);
      const normalizedAngle = relativePointerAngle < 0 ? relativePointerAngle + 2 * Math.PI : relativePointerAngle;
      const currentSegment = Math.floor(normalizedAngle / anglePerSegment);
      
      if (currentSegment !== lastSegmentIndex.current) {
        lastSegmentIndex.current = currentSegment;
        playTickSound();
      }

      drawWheel(currentAngle);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Stop animation and finish
        onSpinComplete();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [winningIndex, isSpinning, prizes.length, onSpinComplete, drawWheel]);

  // Handle high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = 800; // Increased size to 800px! Very large and impressive
    
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = `${displaySize}px`;
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = '1 / 1';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    drawWheel(angleRef.current);
  }, [drawWheel]);

  return (
    <div className="relative flex items-center justify-center select-none w-full max-w-[800px] aspect-square mx-auto">
      {/* Decorative Outer Shadow Ring */}
      <div className="absolute w-[104%] h-[104%] max-w-[832px] max-h-[832px] rounded-full border-4 border-slate-700/30 bg-slate-900/10 shadow-[0_0_60px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(255,255,255,0.06)] pointer-events-none" />
      
      <canvas
        ref={canvasRef}
        className="z-10 cursor-pointer drop-shadow-[0_25px_60px_rgba(0,0,0,0.7)] w-full h-full aspect-square"
        onClick={initAudio}
      />
    </div>
  );
}
