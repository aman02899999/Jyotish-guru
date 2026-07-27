"use client";

import { useEffect, useRef, useState } from "react";
import { Planetarium, webglAvailable } from "./planetarium-class";
import { FadeIn } from "./fade-in";
import { Button } from "./ui/button";

export function PlanetariumSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [plDate, setPlDate] = useState<string>("—");
  const [selectedPlanet, setSelectedPlanet] = useState<any>(null);
  const plRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showZodiac, setShowZodiac] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!webglAvailable()) {
      setError("WebGL is unavailable on this device.");
      return;
    }

    const pl = new Planetarium(canvasRef.current, {
      date: new Date(),
      onSelect: (info: any) => {
        setSelectedPlanet(info);
      },
    });
    pl.setAyanamsa("lahiri");
    pl.onFrame = (d: Date) => {
      setPlDate(
        d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    };
    plRef.current = pl;

    // We must manually trigger resize at least once after mount
    setTimeout(() => pl.resize(), 50);

    return () => {
      pl.dispose();
    };
  }, []);

  return (
    <section id="planetarium" className="mt-24 mb-16 px-4 sm:px-6">
      <FadeIn>
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron/30 bg-paper/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-saffron">
              Real-Time WebGL Planetarium
            </span>
            <h2 className="mt-4 font-display text-3xl font-semibold text-ink sm:text-4xl">
              Walk Through the Navagraha in 3D
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-clay">
              Every sphere is placed by the same sidereal engine that builds your kundli.
              Drag to orbit, scroll to zoom, click a graha to read its karakatva.
            </p>
          </div>

          <div
            ref={containerRef}
            className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-saffron/20 bg-[#0d0914] shadow-2xl"
          >
            {error && (
              <div className="absolute inset-0 flex items-center justify-center text-clay">
                {error}
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="h-full w-full outline-none"
              aria-label="Interactive 3D solar system"
            />

            {!error && (
              <>
                <div className="pointer-events-none absolute left-6 top-6 flex items-center gap-4">
                  <div className="flex flex-col rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur-md">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                      Simulated Date
                    </span>
                    <strong className="text-sm text-white/90">{plDate}</strong>
                  </div>
                  <div className="rounded-lg bg-black/40 px-3 py-1.5 backdrop-blur-md">
                    <span className="text-sm font-medium text-white/80">Lahiri Ayanamsa</span>
                  </div>
                </div>

                {selectedPlanet && (
                  <div className="absolute right-6 top-6 bottom-6 w-72 overflow-y-auto rounded-2xl bg-black/60 p-6 backdrop-blur-xl border border-white/10 shadow-xl transition-all">
                    <button
                      onClick={() => {
                        setSelectedPlanet(null);
                        plRef.current?.select(null);
                      }}
                      className="absolute right-4 top-4 text-white/50 hover:text-white"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl shadow-inner">
                        {selectedPlanet.glyph}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{selectedPlanet.key}</h3>
                        <span className="text-sm text-saffron">{selectedPlanet.sanskrit}</span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-white/80 leading-relaxed">
                      {selectedPlanet.karaka}
                    </p>
                    <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/50">Deity</span>
                        <span className="text-white font-medium text-right">{selectedPlanet.deity || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Gem</span>
                        <span className="text-white font-medium text-right">{selectedPlanet.gem || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Mantra</span>
                        <span className="text-white font-medium text-right">{selectedPlanet.mantra || "—"}</span>
                      </div>
                      {selectedPlanet.distanceAU && (
                        <div className="flex justify-between">
                          <span className="text-white/50">Distance</span>
                          <span className="text-white font-medium text-right">{selectedPlanet.distanceAU.toFixed(2)} AU</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 rounded-2xl bg-black/50 p-3 backdrop-blur-md">
                  {/* Playback Controls */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      onClick={() => {
                        const newPlaying = !isPlaying;
                        setIsPlaying(newPlaying);
                        plRef.current?.setPlaying(newPlaying);
                      }}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60">Speed</span>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.5"
                        value={speed}
                        onChange={(e) => {
                          const newSpeed = parseFloat(e.target.value);
                          setSpeed(newSpeed);
                          plRef.current?.setSpeed(newSpeed);
                        }}
                        className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-saffron"
                      />
                      <span className="min-w-[2ch] text-xs text-white/80">{speed}x</span>
                    </div>
                    <div className="h-5 w-px bg-white/20" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-white hover:bg-white/20"
                      onClick={() => {
                        const now = new Date();
                        setPlDate(now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
                        plRef.current?.setDate(now);
                      }}
                    >
                      Reset Now
                    </Button>
                  </div>
                  {/* Toggle Controls */}
                  <div className="flex items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={showOrbits}
                        onChange={(e) => {
                          setShowOrbits(e.target.checked);
                          plRef.current?.setOrbits(e.target.checked);
                        }}
                        className="h-3.5 w-3.5 accent-saffron"
                      />
                      Orbits
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={showLabels}
                        onChange={(e) => {
                          setShowLabels(e.target.checked);
                          plRef.current?.setLabels(e.target.checked);
                        }}
                        className="h-3.5 w-3.5 accent-saffron"
                      />
                      Labels
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={showZodiac}
                        onChange={(e) => {
                          setShowZodiac(e.target.checked);
                          plRef.current?.setZodiac(e.target.checked);
                        }}
                        className="h-3.5 w-3.5 accent-saffron"
                      />
                      Zodiac
                    </label>
                    <div className="h-5 w-px bg-white/20" />
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-white hover:bg-white/20" onClick={() => plRef.current?.view('wide')}>Wide</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-white hover:bg-white/20" onClick={() => plRef.current?.view('ecliptic')}>Ecliptic</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-white hover:bg-white/20" onClick={() => plRef.current?.view('top')}>Top</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
