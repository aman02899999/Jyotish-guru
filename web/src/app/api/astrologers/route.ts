import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAstrologersWithStats } from "@/lib/astrologer-stats";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const astrologers = await getAstrologersWithStats();
  return NextResponse.json({ astrologers });
}
