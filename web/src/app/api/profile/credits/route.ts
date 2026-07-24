import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { CREDITS_PACKS } from "@/lib/subscriptions";
import { grantCredits } from "@/lib/grants";
import { isRazorpayConfigured } from "@/lib/razorpay";

const creditsSchema = z.object({ packId: z.string() });

/**
 * Mock-adds wallet credits - no real payment gateway. Only reachable when
 * Razorpay isn't configured; once it is, buying credits goes through
 * /api/payments/razorpay instead and this route refuses to run so it can't
 * be used as a free-money bypass.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRazorpayConfigured) {
    return NextResponse.json({ error: "Use real checkout - the sandbox payment flow is disabled." }, { status: 403 });
  }

  const parsed = creditsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const pack = CREDITS_PACKS.find((p) => p.id === parsed.data.packId);
  if (!pack) return NextResponse.json({ error: "Unknown credits pack" }, { status: 404 });

  await grantCredits(user.id, pack.id);

  const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const safeUser = toSafeUser(updated);
  return NextResponse.json({ user: safeUser });
}
