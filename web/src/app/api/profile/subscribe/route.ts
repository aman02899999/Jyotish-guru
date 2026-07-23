import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_TIERS } from "@/lib/subscriptions";
import { getConsultationPrice } from "@/lib/pricing-calculator";

const PERIOD_MS: Record<string, number> = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

const subscribeSchema = z.object({ tierId: z.string() });

/**
 * Mock-activates a subscription tier - no real payment gateway, mirrors the
 * Android app's simulated Google Play Billing subscription flow.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === parsed.data.tierId);
  if (!tier) return NextResponse.json({ error: "Unknown subscription tier" }, { status: 404 });

  const expiry = new Date(Date.now() + (PERIOD_MS[tier.period] ?? PERIOD_MS.month));

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionTier: tier.name, subscriptionExpiry: expiry },
  });

  // If the user has a most-recent unpaid session that this new tier now makes free, unlock it.
  const latestUnpaid = await prisma.reportSession.findFirst({
    where: { userId: user.id, isPaid: false },
    orderBy: { createdAt: "desc" },
  });

  let unlockedSessionId: string | null = null;
  if (latestUnpaid) {
    const newPrice = getConsultationPrice(latestUnpaid.astrologerId, latestUnpaid.price, tier.name);
    if (newPrice === 0) {
      await prisma.reportSession.update({
        where: { id: latestUnpaid.id },
        data: { isPaid: true, price: newPrice },
      });
      unlockedSessionId = latestUnpaid.id;
    } else if (newPrice !== latestUnpaid.price) {
      await prisma.reportSession.update({
        where: { id: latestUnpaid.id },
        data: { price: newPrice },
      });
    }
  }

  const safeUser = toSafeUser(updatedUser);
  return NextResponse.json({ user: safeUser, unlockedSessionId });
}
