import "server-only";
import type { User } from "@prisma/client";
import { getOwnedSession } from "@/lib/owned-session";
import { SUBSCRIPTION_TIERS, CREDITS_PACKS } from "@/lib/subscriptions";

export type PaymentPurpose =
  | { type: "subscription"; tierId: string }
  | { type: "credits"; packId: string }
  | { type: "report"; sessionId: string };

export interface ResolvedPurpose {
  amount: number; // rupees, always > 0
  description: string;
  ref: string;
}

/**
 * Resolves a payment purpose to a trusted server-side amount. The client
 * only ever tells us *what* it wants to buy (a tier id, pack id, or session
 * id) - never an amount - so a tampered request can change what's being
 * bought but never what it costs.
 */
export async function resolvePurpose(purpose: PaymentPurpose, user: User): Promise<ResolvedPurpose | null> {
  switch (purpose.type) {
    case "subscription": {
      const tier = SUBSCRIPTION_TIERS.find((t) => t.id === purpose.tierId);
      if (!tier) return null;
      return { amount: tier.price, description: `${tier.name} subscription (per ${tier.period})`, ref: tier.id };
    }
    case "credits": {
      const pack = CREDITS_PACKS.find((p) => p.id === purpose.packId);
      if (!pack) return null;
      return { amount: pack.price, description: `${pack.name} - ₹${pack.creditsAmount} wallet credits`, ref: pack.id };
    }
    case "report": {
      const session = await getOwnedSession(purpose.sessionId, user);
      if (!session || session.isPaid || session.price <= 0) return null;
      return {
        amount: session.price,
        description: `Consultation with ${session.astrologerName}`,
        ref: session.id,
      };
    }
    default:
      return null;
  }
}
