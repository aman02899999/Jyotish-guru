import { NextResponse } from "next/server";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

/** Resets the one-time referral claim so the demo flow can be tried again. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { referralClaimed: false },
  });

  const safeUser = toSafeUser(updated);
  return NextResponse.json({ user: safeUser });
}
