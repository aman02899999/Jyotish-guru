import "server-only";
import { prisma } from "@/lib/prisma";
import { SUBSCRIPTION_TIERS, CREDITS_PACKS } from "@/lib/subscriptions";
import { getConsultationPrice } from "@/lib/pricing-calculator";

const PERIOD_MS: Record<string, number> = {
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

/**
 * Applies the effect of a successful payment. Shared between the real
 * Razorpay verify route and the sandbox demo routes (which only run when
 * Razorpay isn't configured) so the "what does this purchase actually do"
 * logic only exists once.
 */
export async function grantSubscription(userId: string, tierId: string): Promise<void> {
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId);
  if (!tier) return;

  const expiry = new Date(Date.now() + (PERIOD_MS[tier.period] ?? PERIOD_MS.month));
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: tier.name, subscriptionExpiry: expiry },
  });

  // If the user has a most-recent unpaid session that this new tier now makes free, unlock it.
  const latestUnpaid = await prisma.reportSession.findFirst({
    where: { userId, isPaid: false },
    orderBy: { createdAt: "desc" },
  });
  if (latestUnpaid) {
    const newPrice = getConsultationPrice(latestUnpaid.astrologerId, latestUnpaid.price, tier.name);
    if (newPrice === 0) {
      await prisma.reportSession.update({
        where: { id: latestUnpaid.id },
        data: { isPaid: true, price: newPrice },
      });
    } else if (newPrice !== latestUnpaid.price) {
      await prisma.reportSession.update({ where: { id: latestUnpaid.id }, data: { price: newPrice } });
    }
  }
}

export async function grantCredits(userId: string, packId: string): Promise<void> {
  const pack = CREDITS_PACKS.find((p) => p.id === packId);
  if (!pack) return;
  await prisma.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: pack.creditsAmount } },
  });
}

export async function grantReportUnlock(userId: string, sessionId: string): Promise<void> {
  await prisma.reportSession.updateMany({
    where: { id: sessionId, userId },
    data: { isPaid: true },
  });
}
