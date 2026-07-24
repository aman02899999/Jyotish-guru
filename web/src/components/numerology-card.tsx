"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculateNumerologyProfile, type NumerologyProfile } from "@/lib/numerology-calculator";

const today = new Date().toISOString().slice(0, 10);

export function NumerologyCard({ userName }: { userName: string }) {
  const [dob, setDob] = useState("");
  const [profile, setProfile] = useState<NumerologyProfile | null>(null);

  function reveal(event: React.FormEvent) {
    event.preventDefault();
    if (!dob) return;
    setProfile(calculateNumerologyProfile(userName, dob));
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔢</span>
        <div>
          <p className="font-bold text-celestial-gold">Numerology Insights</p>
          <p className="text-xs text-space-lavender">Discover your Life Path &amp; Destiny numbers</p>
        </div>
      </div>

      <form onSubmit={reveal} className="mt-4 flex items-center gap-2">
        <Input
          type="date"
          max={today}
          required
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          aria-label="Your date of birth"
          className="h-10"
        />
        <Button type="submit" size="sm" disabled={!dob}>
          <Sparkles className="h-3.5 w-3.5" /> Reveal
        </Button>
      </form>

      {profile && (
        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-celestial-gold/20 bg-deep-midnight p-3 text-center">
              <p className="text-[10px] text-space-lavender">Life Path Number</p>
              <p className="text-2xl font-black text-celestial-gold">{profile.lifePathNumber}</p>
            </div>
            <div className="rounded-xl border border-astral-rose/20 bg-deep-midnight p-3 text-center">
              <p className="text-[10px] text-space-lavender">Destiny Number</p>
              <p className="text-2xl font-black text-astral-rose">{profile.destinyNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-deep-midnight p-2">
              <p className="text-[9px] text-space-lavender">Ruling Planet</p>
              <p className="text-[11px] font-bold text-galactic-white">{profile.rulingPlanet}</p>
            </div>
            <div className="rounded-lg bg-deep-midnight p-2">
              <p className="text-[9px] text-space-lavender">Lucky Day</p>
              <p className="text-[11px] font-bold text-galactic-white">{profile.luckyDay}</p>
            </div>
            <div className="rounded-lg bg-deep-midnight p-2">
              <p className="text-[9px] text-space-lavender">Lucky Color</p>
              <p className="text-[11px] font-bold text-galactic-white">{profile.luckyColor}</p>
            </div>
          </div>

          <p className="rounded-xl border border-celestial-gold/15 bg-soft-plum p-3 text-xs leading-relaxed text-space-lavender">
            {profile.traits}
          </p>
        </div>
      )}
    </Card>
  );
}
