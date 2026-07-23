import { NextResponse } from "next/server";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral-code";

const DEMO_PLAN_NAME = "Mahadasha Gold";
const DEMO_PLAN_PRICE = 1999;

/**
 * Simulates a friend downloading the app and completing their first paid
 * consultation using this user's referral code, crediting 50% of a
 * reference plan price. One-time only, mirrors the Android app's demo
 * referral-simulation button.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.referralClaimed) {
    return NextResponse.json(
      { error: "Referral bonus is a ONE-TIME reward. You already claimed it - use reset to test again." },
      { status: 400 }
    );
  }

  const bonus = Math.floor(DEMO_PLAN_PRICE * 0.5);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { walletBalance: { increment: bonus }, referralClaimed: true },
  });

  const safeUser = toSafeUser(updated);
  return NextResponse.json({
    user: safeUser,
    message: `Kalyan Ho! Your friend activated '${DEMO_PLAN_NAME}' (₹${DEMO_PLAN_PRICE}) using your code '${generateReferralCode(
      user.name
    )}'. You received your one-time 50% bonus of ₹${bonus} in your Referral Wallet!`,
  });
}
