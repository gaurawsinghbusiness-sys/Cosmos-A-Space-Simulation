'use client';

import { useEffect, useRef, useState } from 'react';
import { CosmosSimulation } from '@/lib/simulation';

export default function CosmosCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sim, setSim] = useState<CosmosSimulation | null>(null);
  const [hasSparked, setHasSparked] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize the game engine
    const simulation = new CosmosSimulation(canvasRef.current);
    simulation.start();
    setSim(simulation);

    return () => {
      simulation.stop();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (sim && !hasSparked) {
      sim.spark(e.clientX, e.clientY);
      setHasSparked(true);
    }
  };

  const handleRestart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (sim) {
      sim.reset();
      setHasSparked(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505]">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`absolute inset-0 z-0 ${!hasSparked ? 'cursor-crosshair' : 'cursor-default'}`}
      />
      
      {/* Pre-Spark HUD */}
      {!hasSparked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <p className="text-white/70 font-mono text-sm tracking-[0.3em] uppercase animate-pulse">
            Click to Spark the Universe
          </p>
        </div>
      )}

      {/* Post-Spark HUD */}
      {hasSparked && (
        <>
          <div className="absolute top-6 left-6 z-10 pointer-events-none flex flex-col gap-2">
            <p className="text-[#00f0ff] font-mono text-xs tracking-widest uppercase opacity-80">
              Era: Nebula Formation
            </p>
            <p className="text-white/40 font-mono text-[10px] tracking-wider uppercase">
              Particles: 800
            </p>
            <p className="text-white/40 font-mono text-[10px] tracking-wider uppercase">
              Gravity: Active
            </p>
          </div>
          
          <button 
            onClick={handleRestart}
            className="absolute top-6 right-6 z-20 px-4 py-2 border border-white/20 text-white/70 font-mono text-[10px] tracking-widest uppercase hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            Restart Universe
          </button>
        </>
      )}
    </div>
  );
}
