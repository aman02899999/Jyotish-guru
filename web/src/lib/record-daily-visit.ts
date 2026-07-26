import "server-only";
import { prisma } from "@/lib/prisma";
import { computeNextStreak, type StreakInfo } from "@/lib/streak";

/** Called once per dashboard visit; only writes to the DB if today hasn't already been recorded. */
export async function recordDailyVisit(
  userId: string,
  lastActiveDate: string | null,
  currentStreak: number,
  longestStreak: number
): Promise<StreakInfo> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const next = computeNextStreak(lastActiveDate, currentStreak, longestStreak, todayStr);

  if (next.changed) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveDate: todayStr, currentStreak: next.currentStreak, longestStreak: next.longestStreak },
    });
  }

  return { currentStreak: next.currentStreak, longestStreak: next.longestStreak };
}
