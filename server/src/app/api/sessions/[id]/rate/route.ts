import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedSession } from "@/lib/owned-session";
import { prisma } from "@/lib/prisma";

// No URLs - a lightweight guard against link-spam in publicly-displayed
// review text, since this app has no moderation queue/admin review flow.
const URL_PATTERN = /https?:\/\/|www\./i;

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z
    .string()
    .trim()
    .max(500, "Review must be 500 characters or fewer.")
    .refine((text) => !URL_PATTERN.test(text), "Reviews can't contain links.")
    .optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await getOwnedSession(id, user);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.rating !== null) {
    return NextResponse.json({ error: "Session already rated." }, { status: 400 });
  }

  const parsed = rateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.reportSession.update({
    where: { id: session.id },
    data: {
      rating: parsed.data.rating,
      reviewText: parsed.data.reviewText || null,
    },
  });

  return NextResponse.json({ session: updated });
}
