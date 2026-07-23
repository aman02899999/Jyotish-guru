import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { generateDailyHoroscope } from "@/lib/gemini";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const latestSession = await prisma.reportSession.findFirst({
    where: {
      userId: user.id,
      dob: { not: "" },
      tob: { not: "" },
      pob: { not: "" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!latestSession) {
    return NextResponse.json({
      horoscope:
        "To reveal your daily alignment, please first request and complete a consult report with any of our esteemed astrologers so we can map your natal planetary positions.",
    });
  }

  const horoscope = await generateDailyHoroscope(
    user.name,
    latestSession.gender,
    latestSession.dob,
    latestSession.tob,
    latestSession.pob,
    user.preferredLanguage
  );

  return NextResponse.json({ horoscope });
}
