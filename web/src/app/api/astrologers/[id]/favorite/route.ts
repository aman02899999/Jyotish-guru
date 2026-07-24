import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getAstrologerById } from "@/lib/astrologers";

/** Toggles the current user's bookmark on an astrologer. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const astrologerId = Number(id);
  if (!getAstrologerById(astrologerId)) {
    return NextResponse.json({ error: "Unknown astrologer" }, { status: 404 });
  }

  const existing = await prisma.favoriteAstrologer.findUnique({
    where: { userId_astrologerId: { userId: user.id, astrologerId } },
  });

  if (existing) {
    await prisma.favoriteAstrologer.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favoriteAstrologer.create({ data: { userId: user.id, astrologerId } });
  return NextResponse.json({ favorited: true });
}
