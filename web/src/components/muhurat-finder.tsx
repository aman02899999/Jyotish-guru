"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { findMuhuratWindow, ACTIVITY_TYPES, type MuhuratRating } from "@/lib/muhurat-calculator";

const today = new Date().toISOString().slice(0, 10);

const RATING_STYLES: Record<MuhuratRating, string> = {
  "Highly Auspicious": "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Auspicious: "border-celestial-gold/40 bg-celestial-gold/10 text-celestial-gold",
  "Use Caution": "border-red-500/30 bg-red-500/10 text-red-300",
};

export function MuhuratFinder() {
  const [activityId, setActivityId] = useState(ACTIVITY_TYPES[0].id);
  const activity = ACTIVITY_TYPES.find((a) => a.id === activityId) ?? ACTIVITY_TYPES[0];

  const days = useMemo(() => findMuhuratWindow(today, 14), []);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="mb-3 text-xs font-bold text-celestial-gold">WHAT ARE YOU PLANNING?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACTIVITY_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActivityId(a.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                a.id === activityId
                  ? "border-celestial-gold bg-celestial-gold/10"
                  : "border-space-lavender/20 bg-deep-midnight hover:border-celestial-gold/40"
              }`}
            >
              <p className="text-lg">{a.icon}</p>
              <p className="mt-1 text-xs font-bold text-galactic-white">{a.name}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-space-lavender">{activity.description}</p>
      </Card>

      <div className="space-y-3">
        {days.map((day) => (
          <Card key={day.date} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-celestial-gold/20 bg-deep-midnight">
                <p className="text-[9px] text-space-lavender">
                  {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short" })}
                </p>
                <p className="text-sm font-bold text-galactic-white">{day.date.slice(-2)}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-galactic-white">
                  {day.panchang.tithi} <span className="text-space-lavender">&middot; {day.tithiCategory}</span>
                </p>
                <p className="text-xs text-space-lavender">{day.reason}</p>
              </div>
            </div>
            <span
              className={`shrink-0 self-start rounded-full border px-3 py-1 text-[10px] font-bold sm:self-center ${RATING_STYLES[day.rating]}`}
            >
              {day.rating}
            </span>
          </Card>
        ))}
      </div>

      <p className="text-center text-[10px] text-space-lavender/60">
        Based on classical tithi-position rules (Nanda/Bhadra/Jaya/Rikta/Purna). For guidance and entertainment -
        consult an astrologer to confirm exact timing for major events.
      </p>
    </div>
  );
}
