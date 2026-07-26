"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HoroscopePeriod = "daily" | "weekly" | "monthly";

const PERIODS: { value: HoroscopePeriod; label: string }[] = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
];

export function DailyHoroscopeCard() {
  const [period, setPeriod] = useState<HoroscopePeriod>("daily");
  const [horoscope, setHoroscope] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchHoroscope(forPeriod: HoroscopePeriod) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/daily-horoscope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: forPeriod }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setHoroscope(data.horoscope);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function selectPeriod(next: HoroscopePeriod) {
    setPeriod(next);
    setHoroscope(null);
    setError(null);
  }

  return (
    <Card data-testid="daily-horoscope-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <div>
            <p className="font-bold text-saffron">Vedic Rashifal</p>
            <p className="text-xs text-clay">Your transit alignment forecast</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => fetchHoroscope(period)} disabled={isLoading}>
          {isLoading ? "Consulting..." : horoscope ? "Refresh" : "Reveal"}
        </Button>
      </div>

      <div className="flex gap-1.5 px-5 pb-3">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => selectPeriod(p.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-bold transition-colors",
              period === p.value
                ? "border-saffron bg-saffron text-ink"
                : "border-clay/30 text-clay hover:border-saffron/50"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="px-5 pb-4 text-xs text-red-600">{error}</p>}

      {horoscope && (
        <div className="border-t border-clay/15 px-5 py-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{horoscope}</p>
        </div>
      )}
    </Card>
  );
}
