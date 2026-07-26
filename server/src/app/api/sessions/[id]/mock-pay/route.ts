import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedSession } from "@/lib/owned-session";
import { grantReportUnlock } from "@/lib/grants";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";

/**
 * Sandbox card/UPI checkout simulator - mirrors the Android app's "Simulate
 * Successful Purchase" Play Billing sandbox button. Only reachable when a
 * real payment gateway isn't configured; once Razorpay is live this route
 * refuses to run so it can't be used as a free-unlock bypass.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRazorpayConfigured) {
    return NextResponse.json({ error: "Use real checkout - the sandbox payment flow is disabled." }, { status: 403 });
  }

  const { id } = await params;
  const session = await getOwnedSession(id, user);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await grantReportUnlock(user.id, session.id);
  const updated = await prisma.reportSession.findUnique({ where: { id: session.id } });

  return NextResponse.json({ session: updated });
}
