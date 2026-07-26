"use client";

import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PanchangElements } from "@/lib/panchang-calculator";

type Panchang = PanchangElements & { date: string; explanation: string };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function PanchangCard({ initial }: { initial: Panchang }) {
  const [panchang, setPanchang] = useState<Panchang>(initial);
  const [isPending, startTransition] = useTransition();
  const today = todayStr();

  function goToDate(nextDate: string) {
    if (nextDate === panchang.date) return;
    startTransition(async () => {
      const response = await fetch(`/api/panchang?date=${nextDate}`);
      const data = await response.json();
      setPanchang(data);
    });
  }

  return (
    <Card data-testid="panchang-card">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-bold text-saffron">Vedic Panchang Calendar</p>
            <p className="text-xs text-clay">Daily celestial timeline &amp; sacred timings</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToDate(shiftDate(panchang.date, -1))}
            className="rounded-full p-1.5 text-saffron hover:bg-ink/5"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goToDate(today)}
            disabled={panchang.date === today}
            className="rounded-lg border border-saffron/40 bg-saffron/10 px-2 py-1 text-[10px] font-bold text-saffron disabled:opacity-60"
          >
            {panchang.date}
          </button>
          <button
            type="button"
            onClick={() => goToDate(shiftDate(panchang.date, 1))}
            className="rounded-full p-1.5 text-saffron hover:bg-ink/5"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`space-y-3 px-5 pb-5 transition-opacity ${isPending ? "opacity-50" : ""}`}>
        <div className="grid grid-cols-2 gap-2">
          <PanchangStat label="Tithi (तिथि)" value={panchang.tithi} />
          <PanchangStat label="Nakshatra (नक्षत्र)" value={panchang.nakshatra} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PanchangStat label="Sunrise / Sunset" value={`${panchang.sunrise} / ${panchang.sunset}`} />
          <PanchangStat label="Rahu Kaal (⚡)" value={panchang.rahuKaal} accent />
        </div>
        <div className="rounded-xl border border-saffron/15 bg-paper p-3">
          <p className="mb-1 text-xs font-bold text-saffron">✨ Today&apos;s Significance</p>
          <p
            className="text-xs leading-relaxed text-clay"
            dangerouslySetInnerHTML={{ __html: panchang.explanation.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }}
          />
        </div>
      </div>
    </Card>
  );
}

function PanchangStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-clay/15 bg-cream p-2.5">
      <p className="text-[10px] text-clay">{label}</p>
      <p className={`mt-0.5 text-xs font-bold ${accent ? "text-rust" : "text-ink"}`}>{value}</p>
    </div>
  );
}
