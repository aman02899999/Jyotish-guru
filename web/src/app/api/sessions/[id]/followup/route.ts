import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedSession } from "@/lib/owned-session";
import { prisma } from "@/lib/prisma";
import { generateFollowUpResponse } from "@/lib/gemini";
import { getAstrologerById } from "@/lib/astrologers";

const followUpSchema = z.object({ question: z.string().min(1).max(1000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await getOwnedSession(id, user);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.isPaid || !session.reportText) {
    return NextResponse.json({ error: "This consultation is not unlocked yet." }, { status: 400 });
  }
  if (session.followUpQuestion) {
    return NextResponse.json({ error: "This session already used its included follow-up question." }, { status: 400 });
  }

  const parsed = followUpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const astrologer = getAstrologerById(session.astrologerId);
  const followUpResponse = await generateFollowUpResponse({
    userName: session.userName,
    dob: session.dob,
    tob: session.tob,
    pob: session.pob,
    originalQuestion: session.question,
    originalReport: session.reportText,
    followUpQuestion: parsed.data.question,
    astrologerName: session.astrologerName,
    specialty: session.specialty,
    style: astrologer?.style ?? "Traditional Vedic",
    bio: astrologer?.bio ?? "",
    language: user.preferredLanguage,
  });

  const updated = await prisma.reportSession.update({
    where: { id: session.id },
    data: { followUpQuestion: parsed.data.question, followUpResponse },
  });

  return NextResponse.json({ session: updated });
}
