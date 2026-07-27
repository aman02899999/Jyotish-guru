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
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/40 p-2 backdrop-blur-md">
                  <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/20" onClick={() => plRef.current?.view('wide')}>Wide</Button>
                  <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/20" onClick={() => plRef.current?.view('ecliptic')}>Ecliptic</Button>
                  <Button variant="ghost" size="sm" className="h-8 text-white hover:bg-white/20" onClick={() => plRef.current?.view('top')}>Top</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
