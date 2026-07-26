import { Card } from "@/components/ui/card";
import { calculateTransitAlerts, type TransitSeverity } from "@/lib/transit-calculator";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<TransitSeverity, string> = {
  auspicious: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  neutral: "border-saffron/30 bg-saffron/10 text-saffron",
  caution: "border-red-500/25 bg-red-500/10 text-red-600",
};

const SEVERITY_LABELS: Record<TransitSeverity, string> = {
  auspicious: "Favorable",
  neutral: "Significant",
  caution: "Use Caution",
};

export function TransitAlerts({ dob, tob }: { dob: string; tob: string }) {
  const alerts = calculateTransitAlerts(dob, tob);

  return (
    <Card className="p-5">
      <p className="font-display mb-1 text-sm font-bold text-saffron">Current Transit Alerts (Gochar)</p>
      <p className="mb-4 text-xs text-clay">
        How today&apos;s Saturn and Jupiter transits interact with your natal Moon sign.
      </p>

      {alerts.length === 0 ? (
        <p className="rounded-xl border border-clay/15 bg-cream/60 px-4 py-3 text-xs text-clay">
          No major Saturn or Jupiter transit alerts are active for your chart right now.
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.planet} className={cn("rounded-xl border p-4", SEVERITY_STYLES[alert.severity])}>
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <span>{alert.symbol}</span> {alert.title}
                </p>
                <span className="shrink-0 rounded-full bg-paper/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                  {SEVERITY_LABELS[alert.severity]}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink/80">{alert.description}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[10px] text-clay/60">
        Based on classical Sade Sati/Kantaka Shani and Guru Gochar rules from your Moon sign. For guidance and
        entertainment only.
      </p>
    </Card>
  );
}
