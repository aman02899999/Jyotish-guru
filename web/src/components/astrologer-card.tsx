import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AstrologerWithStats } from "@/lib/astrologer-stats";

export function AstrologerCard({ astrologer }: { astrologer: AstrologerWithStats }) {
  return (
    <Link href={`/astrologer/${astrologer.id}`}>
      <Card className="flex h-full flex-col gap-3 p-4 transition-transform hover:-translate-y-0.5 hover:border-celestial-gold/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-celestial-gold/40 bg-gradient-to-br from-soft-plum to-dark-space-purple text-2xl">
              {astrologer.iconSymbol}
            </div>
            <div>
              <p className="font-bold text-galactic-white">{astrologer.name}</p>
              <p className="text-xs font-semibold text-celestial-gold">{astrologer.specialty}</p>
            </div>
          </div>
          <span className="whitespace-nowrap text-lg font-extrabold text-celestial-gold">
            ₹{astrologer.price}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-space-lavender/90">{astrologer.bio}</p>

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-galactic-white">
            <span className="text-celestial-gold">★</span>
            <span className="font-bold">
              {astrologer.averageRating !== null ? astrologer.averageRating.toFixed(1) : "New"}
            </span>
            {astrologer.totalSessions > 0 && (
              <span className="text-space-lavender">({astrologer.totalSessions} sessions)</span>
            )}
          </div>
          <Badge variant="muted">🤖 AI Astrologer</Badge>
        </div>
      </Card>
    </Link>
  );
}
