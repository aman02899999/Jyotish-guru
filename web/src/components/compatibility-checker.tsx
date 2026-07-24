"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateGunaMilan, moonNakshatraName, type GunaMilanResult } from "@/lib/kundli-milan-calculator";

const today = new Date().toISOString().slice(0, 10);

export function CompatibilityChecker() {
  const [dob1, setDob1] = useState("");
  const [dob2, setDob2] = useState("");
  const [result, setResult] = useState<GunaMilanResult | null>(null);

  function check(event: React.FormEvent) {
    event.preventDefault();
    if (!dob1 || !dob2) return;
    setResult(calculateGunaMilan(dob1, dob2));
  }

  const scorePercent = result ? Math.round((result.totalPoints / result.maxPoints) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <form onSubmit={check} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="dob1">Partner 1 - Date of Birth</Label>
            <Input id="dob1" type="date" max={today} required value={dob1} onChange={(e) => setDob1(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="dob2">Partner 2 - Date of Birth</Label>
            <Input id="dob2" type="date" max={today} required value={dob2} onChange={(e) => setDob2(e.target.value)} />
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={!dob1 || !dob2}>
            <Sparkles className="h-4 w-4" /> Check Compatibility
          </Button>
        </form>
      </Card>

      {result && (
        <>
          <Card className="border-2 border-saffron/40 p-6 text-center">
            <p className="text-xs font-bold text-clay">
              {moonNakshatraName(dob1)} &amp; {moonNakshatraName(dob2)} Moon Nakshatras
            </p>
            <p className="mt-3 text-5xl font-black text-saffron">
              {result.totalPoints}
              <span className="text-2xl text-clay">/{result.maxPoints}</span>
            </p>
            <div className="mx-auto mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-cream">
              <div className="h-full rounded-full bg-saffron" style={{ width: `${scorePercent}%` }} />
            </div>
            <p className="mt-4 text-sm font-bold text-ink">{result.verdict}</p>
          </Card>

          <div className="space-y-2">
            {result.kootas.map((koota) => (
              <Card key={koota.name} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-bold text-ink">{koota.name}</p>
                  <p className="text-xs text-clay">{koota.description}</p>
                </div>
                <p className="shrink-0 pl-4 text-lg font-black text-saffron">
                  {koota.points}
                  <span className="text-xs text-clay">/{koota.maxPoints}</span>
                </p>
              </Card>
            ))}
          </div>

          <p className="text-center text-[10px] text-clay/60">
            Approximate Ashtakoot Guna Milan, for guidance and entertainment only - not a substitute for a full
            consultation with a professional astrologer before making marriage decisions.
          </p>
        </>
      )}
    </div>
  );
}
