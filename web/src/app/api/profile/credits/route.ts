import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CREDITS_PACKS } from "@/lib/subscriptions";

const creditsSchema = z.object({ packId: z.string() });

/** Mock-adds wallet credits - no real payment gateway, demo only. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = creditsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const pack = CREDITS_PACKS.find((p) => p.id === parsed.data.packId);
  if (!pack) return NextResponse.json({ error: "Unknown credits pack" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { walletBalance: { increment: pack.creditsAmount } },
  });

  const safeUser = toSafeUser(updated);
  return NextResponse.json({ user: safeUser });
}
