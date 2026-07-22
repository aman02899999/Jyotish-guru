import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const safeUser = toSafeUser(user);
  return NextResponse.json({ user: safeUser });
}

const patchSchema = z.object({
  preferredLanguage: z.enum(["Hinglish", "Hindi", "English"]).optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });
  const safeUser = toSafeUser(updated);
  return NextResponse.json({ user: safeUser });
}
