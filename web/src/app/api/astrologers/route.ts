import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAstrologersWithStats } from "@/lib/astrologer-stats";
import { getFavoriteAstrologerIds } from "@/lib/favorites";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favoriteIds = await getFavoriteAstrologerIds(session.user.id);
  const astrologers = await getAstrologersWithStats(favoriteIds);
  return NextResponse.json({ astrologers });
}
