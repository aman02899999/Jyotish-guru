import "server-only";
import { prisma } from "@/lib/prisma";
import { ASTROLOGERS, type Astrologer } from "@/lib/astrologers";

export interface AstrologerWithStats extends Astrologer {
  averageRating: number | null;
  totalSessions: number;
  isFavorited: boolean;
}

/** Astrologer roster with rating/session counts aggregated across all users' paid sessions. */
export async function getAstrologersWithStats(
  favoriteIds: Set<number> = new Set()
): Promise<AstrologerWithStats[]> {
  const stats = await prisma.reportSession.groupBy({
    by: ["astrologerId"],
    where: { isPaid: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const statsById = new Map(stats.map((s) => [s.astrologerId, s]));

  return ASTROLOGERS.map((astrologer) => {
    const stat = statsById.get(astrologer.id);
    return {
      ...astrologer,
      averageRating: stat?._avg.rating ?? null,
      totalSessions: stat?._count._all ?? 0,
      isFavorited: favoriteIds.has(astrologer.id),
    };
  });
}
