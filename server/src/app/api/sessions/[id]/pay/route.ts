import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedSession } from "@/lib/owned-session";
import { prisma } from "@/lib/prisma";

/** Pays for a session using the user's celestial wallet balance. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await getOwnedSession(id, user);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.isPaid) return NextResponse.json({ session });

  if (user.walletBalance < session.price) {
    return NextResponse.json(
      { error: `Insufficient wallet balance (₹${user.walletBalance}/₹${session.price}).` },
      { status: 400 }
    );
  }

  const updatedSession = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { walletBalance: { decrement: session.price } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: user.id,
        type: "report_payment",
        amount: -session.price,
        balanceAfter: updatedUser.walletBalance,
        description: `Consultation with ${session.astrologerName}`,
      },
    });
    return tx.reportSession.update({
      where: { id: session.id },
      data: { isPaid: true },
    });
  });

  return NextResponse.json({ session: updatedSession });
}
