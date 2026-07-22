import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedSession } from "@/lib/owned-session";
import { prisma } from "@/lib/prisma";

/**
 * Sandbox card/UPI checkout simulator - mirrors the Android app's "Simulate
 * Successful Purchase" Play Billing sandbox button. No real payment gateway
 * is wired up; this is clearly a demo affordance, not production billing.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await getOwnedSession(id, user);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.reportSession.update({
    where: { id: session.id },
    data: { isPaid: true },
  });

  return NextResponse.json({ session: updated });
}
