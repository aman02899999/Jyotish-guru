import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WalletTransactionType = "credit_purchase" | "referral_bonus" | "report_payment";

/**
 * Atomically adjusts a user's wallet balance and records the change in the
 * ledger, so walletBalance stays a cache of transaction history rather than
 * an opaque running total. amount is signed (positive = credit, negative =
 * debit). extraUserData lets a caller update other User fields (e.g.
 * referralClaimed) in the same transaction.
 */
export async function adjustWallet(
  userId: string,
  amount: number,
  type: WalletTransactionType,
  description: string,
  extraUserData: Prisma.UserUpdateInput = {}
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amount }, ...extraUserData },
    });
    await tx.walletTransaction.create({
      data: { userId, type, amount, balanceAfter: user.walletBalance, description },
    });
    return user;
  });
}
