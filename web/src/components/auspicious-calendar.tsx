"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { findMuhuratWindow, type MuhuratDay, type MuhuratRating } from "@/lib/muhurat-calculator";
import { cn } from "@/lib/utils";

const RATING_STYLES: Record<MuhuratRating, string> = {
  "Highly Auspicious": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Auspicious: "bg-saffron/15 text-saffron border-saffron/30",
  "Use Caution": "bg-red-500/10 text-red-600 border-red-500/25",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function AuspiciousCalendar() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [todayYear, todayMonth1Indexed] = todayStr.split("-").map(Number);

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth1Indexed - 1);
  const [selected, setSelected] = useState<MuhuratDay | null>(null);

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const total = daysInMonth(year, month);
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const days = useMemo(() => findMuhuratWindow(firstOfMonthStr, total), [firstOfMonthStr, total]);
  const leadingBlanks = new Date(`${firstOfMonthStr}T12:00:00Z`).getUTCDay();

  function goToMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="rounded-lg border border-clay/20 px-3 py-1.5 text-sm font-bold text-clay hover:border-saffron/50"
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="font-display text-sm font-bold text-saffron">{monthLabel}</p>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="rounded-lg border border-clay/20 px-3 py-1.5 text-sm font-bold text-clay hover:border-saffron/50"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAY_LABELS.map((d) => (
            <p key={d} className="text-[10px] font-bold text-clay">
              {d}
            </p>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const dayNumber = Number(day.date.slice(-2));
            const isToday = day.date === todayStr;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs font-bold transition-colors",
                  RATING_STYLES[day.rating],
                  isToday && "ring-2 ring-saffron ring-offset-1 ring-offset-paper",
                  selected?.date === day.date && "outline outline-2 outline-ink/40"
                )}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-clay">
          {(Object.keys(RATING_STYLES) as MuhuratRating[]).map((rating) => (
            <span key={rating} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full border", RATING_STYLES[rating])} />
              {rating}
            </span>
          ))}
        </div>
      </Card>

      {selected && (
        <Card className="p-5">
          <p className="font-display text-sm font-bold text-saffron">
            {new Date(`${selected.date}T12:00:00Z`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
          <p
            className={cn(
              "mt-2 inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold",
              RATING_STYLES[selected.rating]
            )}
          >
            {selected.rating}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-clay">{selected.reason}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-cream p-2">
              <p className="text-[9px] text-clay">Tithi</p>
              <p className="text-[11px] font-bold text-ink">{selected.panchang.tithi}</p>
            </div>
            <div className="rounded-lg bg-cream p-2">
              <p className="text-[9px] text-clay">Nakshatra</p>
              <p className="text-[11px] font-bold text-ink">{selected.panchang.nakshatra}</p>
            </div>
            <div className="rounded-lg bg-cream p-2">
              <p className="text-[9px] text-clay">Moon Sign</p>
              <p className="text-[11px] font-bold text-ink">{selected.panchang.moonSign}</p>
            </div>
          </div>
        </Card>
      )}

      <p className="text-center text-[10px] text-clay/60">
        Ratings follow the classical Panchanga tithi-position system (Nanda/Bhadra/Jaya/Rikta/Purna), for
        guidance and entertainment only.
      </p>
    </div>
  );
}
