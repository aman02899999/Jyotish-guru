import "server-only";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/** Loads a ReportSession by id and verifies it belongs to the given user. */
export async function getOwnedSession(sessionId: string, user: User) {
  const session = await prisma.reportSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) return null;
  return session;
}
