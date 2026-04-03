'use client';

import { useEffect, useRef, useState } from 'react';
import { CosmosSimulation } from '@/lib/simulation';

export default function CosmosCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sim, setSim] = useState<CosmosSimulation | null>(null);
  const [stats, setStats] = useState({ particleCount: 0, starCount: 0, planetCount: 0, habitableCount: 0, totalPopulation: 0, blackHoleCount: 0, supernovaCount: 0, isSparked: false, timeSinceSpark: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const simulation = new CosmosSimulation(canvasRef.current);
    simulation.start();
    setSim(simulation);

    // Poll stats for the HUD
    let animationFrameId: number;
    const updateStats = () => {
      setStats(simulation.getStats());
      animationFrameId = requestAnimationFrame(updateStats);
    };
    updateStats();

    return () => {
      simulation.stop();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (sim && !stats.isSparked && canvasRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      sim.spark(x, y);
    }
  };

  const handleRestart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (sim) {
      sim.reset();
    }
  };

  const handleCapture = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `cosmos-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (sim && stats.isSparked) {
      sim.setZoom(e.deltaY, e.clientX, e.clientY);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!stats.isSparked) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current && sim && stats.isSparked) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      sim.pan(dx, dy);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (sim) sim.endPan();
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    if (sim) sim.endPan();
  };

  // Determine Era based on stats
  let era = "The Void";
  if (stats.isSparked) {
    if (stats.timeSinceSpark < 600) era = "The Big Bang";
    else if (stats.timeSinceSpark < 1800) era = "Nebula Formation";
    else if (stats.timeSinceSpark < 2400) era = "Stellar Ignition";
    else if (stats.timeSinceSpark < 2600) era = "Solar System Formation";
    else if (stats.timeSinceSpark < 3200) era = "The Spark of Life";
    else if (stats.timeSinceSpark < 4000) era = "Civilization Expansion";
    else if (stats.timeSinceSpark < 4800) era = "Cosmic Events";
    else era = "Supernovas & Galactic War";
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050505]">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`absolute inset-0 z-0 ${!stats.isSparked ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      />
      
      {/* Pre-Spark HUD */}
      {!stats.isSparked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <p className="text-white/70 font-mono text-sm tracking-[0.3em] uppercase animate-pulse">
            Click to Spark the Universe
          </p>
        </div>
      )}

      {/* Post-Spark HUD */}
      {stats.isSparked && (
        <>
          <div className="absolute top-6 left-6 z-10 pointer-events-none flex flex-col gap-2">
            <p className="text-[#00f0ff] font-mono text-xs tracking-widest uppercase opacity-80">
              Era: {era}
            </p>
            <p className="text-white/40 font-mono text-[10px] tracking-wider uppercase">
              Particles: {stats.particleCount}
            </p>
            {stats.starCount > 0 && (
              <p className="text-[#ffb700] font-mono text-[10px] tracking-wider uppercase">
                Stars: {stats.starCount}
              </p>
            )}
            {stats.planetCount > 0 && (
              <p className="text-[#888888] font-mono text-[10px] tracking-wider uppercase">
                Planets: {stats.planetCount}
              </p>
            )}
            {stats.habitableCount > 0 && (
              <p className="text-[#00ff88] font-mono text-[10px] tracking-wider uppercase drop-shadow-[0_0_5px_rgba(0,255,136,0.5)]">
                Habitable: {stats.habitableCount}
              </p>
            )}
            {stats.totalPopulation > 0 && (
              <p className="text-[#00ff00] font-mono text-[10px] tracking-wider uppercase drop-shadow-[0_0_8px_rgba(0,255,0,0.8)]">
                Lifeforms: {stats.totalPopulation.toLocaleString()}
              </p>
            )}
            {stats.blackHoleCount > 0 && (
              <p className="text-[#ff00ff] font-mono text-[10px] tracking-wider uppercase animate-pulse drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]">
                ⚠️ GRAVITATIONAL ANOMALY DETECTED
              </p>
            )}
            {stats.supernovaCount > 0 && (
              <p className="text-[#ffffff] font-mono text-[10px] tracking-wider uppercase animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
                💥 SUPERNOVAE: {stats.supernovaCount}
              </p>
            )}
            <p className="text-white/40 font-mono text-[10px] tracking-wider uppercase">
              Gravity: {stats.timeSinceSpark >= 600 ? 'Active' : 'Inactive'}
            </p>
          </div>
          
          <div className="absolute bottom-6 left-6 z-10 pointer-events-none flex flex-col gap-1">
            <p className="text-white/30 font-mono text-[10px] tracking-widest uppercase">
              Scroll to Zoom • Drag to Pan
            </p>
          </div>

          <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 items-end">
            <button 
              onClick={handleCapture}
              className="px-4 py-2 border border-white/20 text-white/70 font-mono text-[10px] tracking-widest uppercase hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              📸 Capture
            </button>
            <button 
              onClick={handleRestart}
              className="px-4 py-2 border border-white/20 text-white/70 font-mono text-[10px] tracking-widest uppercase hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              🌌 Big Crunch (Reset)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
