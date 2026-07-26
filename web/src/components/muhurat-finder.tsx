"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { findMuhuratWindow, ACTIVITY_TYPES, type MuhuratRating } from "@/lib/muhurat-calculator";

const today = new Date().toISOString().slice(0, 10);

const RATING_STYLES: Record<MuhuratRating, string> = {
  "Highly Auspicious": "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  Auspicious: "border-saffron/40 bg-saffron/10 text-saffron",
  "Use Caution": "border-red-500/30 bg-red-500/10 text-red-700",
};

export function MuhuratFinder() {
  const [activityId, setActivityId] = useState(ACTIVITY_TYPES[0].id);
  const activity = ACTIVITY_TYPES.find((a) => a.id === activityId) ?? ACTIVITY_TYPES[0];

  const days = useMemo(() => findMuhuratWindow(today, 14), []);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="mb-3 text-xs font-bold text-saffron">WHAT ARE YOU PLANNING?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACTIVITY_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActivityId(a.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                a.id === activityId
                  ? "border-saffron bg-saffron/10"
                  : "border-clay/20 bg-cream hover:border-saffron/40"
              }`}
            >
              <p className="text-lg">{a.icon}</p>
              <p className="mt-1 text-xs font-bold text-ink">{a.name}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-clay">{activity.description}</p>
      </Card>

      <div className="space-y-3">
        {days.map((day) => (
          <Card key={day.date} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-saffron/20 bg-cream">
                <p className="text-[9px] text-clay">
                  {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, { month: "short" })}
                </p>
                <p className="text-sm font-bold text-ink">{day.date.slice(-2)}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-ink">
                  {day.panchang.tithi} <span className="text-clay">&middot; {day.tithiCategory}</span>
                </p>
                <p className="text-xs text-clay">{day.reason}</p>
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

      <p className="text-center text-[10px] text-clay/60">
        Based on classical tithi-position rules (Nanda/Bhadra/Jaya/Rikta/Purna). For guidance and entertainment -
        consult an astrologer to confirm exact timing for major events.
      </p>
    </div>
  );
}
