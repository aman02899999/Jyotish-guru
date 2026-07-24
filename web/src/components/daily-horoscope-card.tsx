"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DailyHoroscopeCard() {
  const [horoscope, setHoroscope] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchHoroscope() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/daily-horoscope", { method: "POST" });
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

  return (
    <Card data-testid="daily-horoscope-card">
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <div>
            <p className="font-bold text-saffron">Daily Vedic Rashifal</p>
            <p className="text-xs text-clay">Your transit alignment for today</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchHoroscope} disabled={isLoading}>
          {isLoading ? "Consulting..." : horoscope ? "Refresh" : "Reveal Today"}
        </Button>
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
