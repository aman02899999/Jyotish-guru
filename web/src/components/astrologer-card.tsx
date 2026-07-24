import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AstrologerWithStats } from "@/lib/astrologer-stats";

export function AstrologerCard({ astrologer }: { astrologer: AstrologerWithStats }) {
  return (
    <Link href={`/astrologer/${astrologer.id}`}>
      <Card className="group flex h-full flex-col gap-3 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-saffron/50 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_24px_50px_-16px_rgba(234,88,12,0.25)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-saffron/40 bg-gradient-to-br from-paper to-sand text-2xl shadow-[0_0_16px_-6px_rgba(234,88,12,0.5)] transition-transform duration-300 group-hover:scale-105">
              {astrologer.iconSymbol}
            </div>
            <div>
              <p className="font-display font-semibold tracking-wide text-ink">{astrologer.name}</p>
              <p className="text-xs font-semibold text-saffron">{astrologer.specialty}</p>
            </div>
          </div>
          <span className="whitespace-nowrap text-lg font-extrabold text-saffron">
            ₹{astrologer.price}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-clay/90">{astrologer.bio}</p>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-ink">
            <span className="text-saffron">★</span>
            <span className="font-bold">
              {astrologer.averageRating !== null ? astrologer.averageRating.toFixed(1) : "New"}
            </span>
            {astrologer.totalSessions > 0 && (
              <span className="text-clay">({astrologer.totalSessions} sessions)</span>
            )}
          </div>
          <Badge variant="muted">🤖 AI Astrologer</Badge>
        </div>
      </Card>
    </Link>
  );
}
