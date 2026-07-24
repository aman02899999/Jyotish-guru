import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { generateHoroscope, type HoroscopePeriod } from "@/lib/gemini";

const bodySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const period: HoroscopePeriod = parsed.success ? (parsed.data.period ?? "daily") : "daily";

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

  const horoscope = await generateHoroscope(
    user.name,
    latestSession.gender,
    latestSession.dob,
    latestSession.tob,
    latestSession.pob,
    user.preferredLanguage,
    period
  );

  return NextResponse.json({ horoscope });
}
