"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import {
  calculateCompatibility,
  moonNakshatraName,
  COMPATIBILITY_TYPES,
  type GunaMilanResult,
  type CompatibilityType,
} from "@/lib/kundli-milan-calculator";
import { cn } from "@/lib/utils";

const today = new Date().toISOString().slice(0, 10);

export function CompatibilityChecker() {
  const [type, setType] = useState<CompatibilityType>("marriage");
  const [dob1, setDob1] = useState("");
  const [dob2, setDob2] = useState("");
  const [result, setResult] = useState<GunaMilanResult | null>(null);

  function check(event: React.FormEvent) {
    event.preventDefault();
    if (!dob1 || !dob2) return;
    setResult(calculateCompatibility(dob1, dob2, type));
  }

  function selectType(next: CompatibilityType) {
    setType(next);
    setResult(null);
  }

  const scorePercent = result ? Math.round((result.totalPoints / result.maxPoints) * 100) : 0;
  const typeInfo = COMPATIBILITY_TYPES.find((t) => t.id === type)!;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-clay">Relationship Type</p>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {COMPATIBILITY_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectType(t.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                type === t.id
                  ? "border-saffron bg-saffron/10"
                  : "border-clay/20 hover:border-saffron/40"
              )}
            >
              <p className="text-sm font-bold text-ink">
                {t.icon} {t.label}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-clay">{t.description}</p>
            </button>
          ))}
        </div>

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

            <ShareButton
              filename={`${type}-compatibility-score.png`}
              label="Share This Score"
              className="mt-4 w-full"
              options={{
                emoji: typeInfo.icon,
                title: `${typeInfo.label} Compatibility`,
                subtitle: `${moonNakshatraName(dob1)} & ${moonNakshatraName(dob2)} Moon Nakshatras`,
                stat: { label: `out of ${result.maxPoints} points`, value: `${result.totalPoints}/${result.maxPoints}` },
                lines: result.kootas
                  .slice(0, 4)
                  .map((k) => ({ label: k.name, value: `${k.points}/${k.maxPoints}` })),
                footer: "Check your compatibility at Adi Jyotish Gurus",
              }}
            />
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
            Approximate Ashtakoot Guna Milan factors selected for {typeInfo.label.toLowerCase()} compatibility, for
            guidance and entertainment only - not a substitute for a full consultation with a professional
            astrologer.
          </p>
        </>
      )}
    </div>
  );
}
