import { NextResponse } from "next/server";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionTier: "Free", subscriptionExpiry: null },
  });

  const safeUser = toSafeUser(updated);
  return NextResponse.json({ user: safeUser });
}
