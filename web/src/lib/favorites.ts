import "server-only";
import { prisma } from "@/lib/prisma";

export async function getFavoriteAstrologerIds(userId: string): Promise<Set<number>> {
  const rows = await prisma.favoriteAstrologer.findMany({
    where: { userId },
    select: { astrologerId: true },
  });
  return new Set(rows.map((r) => r.astrologerId));
}
