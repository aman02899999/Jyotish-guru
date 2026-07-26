import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getAstrologerById } from "@/lib/astrologers";
import { getConsultationPrice } from "@/lib/pricing-calculator";
import { generateAstrologyReport } from "@/lib/gemini";

const createSessionSchema = z.object({
  astrologerId: z.number().int(),
  gender: z.string().min(1),
  dob: z.string().min(1),
  tob: z.string().min(1),
  pob: z.string().min(1),
  question: z.string().min(1),
  partnerName: z.string().optional().nullable(),
  partnerDob: z.string().optional().nullable(),
  partnerTob: z.string().optional().nullable(),
  partnerPob: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.reportSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const astrologer = getAstrologerById(data.astrologerId);
  if (!astrologer) {
    return NextResponse.json({ error: "Astrologer not found" }, { status: 404 });
  }

  const price = getConsultationPrice(astrologer.id, astrologer.price, user.subscriptionTier);

  const partnerDetails =
    data.partnerName && astrologer.specialty === "Marriage Matching"
      ? `Partner Name: ${data.partnerName}, DOB: ${data.partnerDob}, TOB: ${data.partnerTob}, POB: ${data.partnerPob}`
      : null;

  const created = await prisma.reportSession.create({
    data: {
      userId: user.id,
      userName: user.name,
      gender: data.gender,
      dob: data.dob,
      tob: data.tob,
      pob: data.pob,
      question: data.question,
      partnerName: astrologer.specialty === "Marriage Matching" ? data.partnerName : null,
      partnerDob: astrologer.specialty === "Marriage Matching" ? data.partnerDob : null,
      partnerTob: astrologer.specialty === "Marriage Matching" ? data.partnerTob : null,
      partnerPob: astrologer.specialty === "Marriage Matching" ? data.partnerPob : null,
      astrologerId: astrologer.id,
      astrologerName: astrologer.name,
      specialty: astrologer.specialty,
      price,
      isPaid: price === 0,
    },
  });

  const reportText = await generateAstrologyReport({
    userName: user.name,
    gender: data.gender,
    dob: data.dob,
    tob: data.tob,
    pob: data.pob,
    question: data.question,
    partnerDetails,
    astrologerName: astrologer.name,
    specialty: astrologer.specialty,
    style: astrologer.style,
    bio: astrologer.bio,
    language: user.preferredLanguage,
  });

  const updated = await prisma.reportSession.update({
    where: { id: created.id },
    data: { reportText },
  });

  return NextResponse.json({ session: updated }, { status: 201 });
}
