import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { answerFAQ } from "@/lib/gemini";

const faqSchema = z.object({ question: z.string().min(1).max(500) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = faqSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const answer = await answerFAQ(parsed.data.question, user.name, user.preferredLanguage);
  return NextResponse.json({ answer });
}
