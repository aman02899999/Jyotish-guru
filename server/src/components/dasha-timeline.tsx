"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { calculateVimshottariDasha, calculateAntardashas, type DashaPeriod } from "@/lib/dasha-calculator";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function DashaTimeline({ dob }: { dob: string }) {
  const periods = calculateVimshottariDasha(dob);
  const currentIndex = periods.findIndex((p) => p.isCurrent);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(currentIndex >= 0 ? currentIndex : null);

  return (
    <Card className="p-5">
      <p className="font-display mb-1 text-sm font-bold text-saffron">Vimshottari Dasha Timeline</p>
      <p className="mb-4 text-xs text-clay">
        Your Mahadasha (major planetary period) sequence - tap one to see its Antardasha sub-periods.
      </p>

      <div className="space-y-2">
        {periods.map((period, index) => (
          <div key={`${period.lord}-${period.startDate}`}>
            <button
              type="button"
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                period.isCurrent
                  ? "border-saffron bg-saffron/10"
                  : "border-clay/15 bg-cream/60 hover:border-saffron/40"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-base">{period.symbol}</span>
                <span className="text-sm font-bold text-ink">{period.lord}</span>
                {period.isCurrent && (
                  <span className="rounded-full bg-saffron px-2 py-0.5 text-[9px] font-bold text-ink">CURRENT</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-clay">
                {formatDate(period.startDate)} - {formatDate(period.endDate)}
              </span>
            </button>

            {expandedIndex === index && <AntardashaList mahadasha={period} />}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[10px] text-clay/60">
        Vimshottari Mahadasha, derived from your Moon Nakshatra at birth. For guidance and entertainment only.
      </p>
    </Card>
  );
}

function AntardashaList({ mahadasha }: { mahadasha: DashaPeriod }) {
  const antardashas = calculateAntardashas(mahadasha);
  return (
    <div className="ml-4 mt-1.5 space-y-1 border-l-2 border-saffron/20 pl-4">
      {antardashas.map((sub) => (
        <div
          key={`${sub.lord}-${sub.startDate}`}
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs",
            sub.isCurrent ? "bg-saffron/15 font-bold text-saffron" : "text-clay"
          )}
        >
          <span>
            {sub.symbol} {mahadasha.lord}-{sub.lord}
          </span>
          <span className="shrink-0">
            {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
          </span>
        </div>
      ))}
    </div>
  );
}
