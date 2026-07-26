import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { calculatePanchang, panchangExplanation } from "@/lib/panchang-calculator";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be formatted as YYYY-MM-DD" }, { status: 400 });
  }

  const elements = calculatePanchang(date);
  const explanation = panchangExplanation(elements, user.preferredLanguage);

  return NextResponse.json({ date, ...elements, explanation });
}
