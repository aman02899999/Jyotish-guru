export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`);
  const db = new Date(`${b}T00:00:00Z`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/**
 * Pure transition logic, kept free of "server-only"/Prisma so it's testable
 * directly: given yesterday's stored state and today's date string, decides
 * the new streak values and whether anything actually needs to be written.
 */
export function computeNextStreak(
  lastActiveDate: string | null,
  currentStreak: number,
  longestStreak: number,
  todayStr: string
): StreakInfo & { changed: boolean } {
  if (lastActiveDate === todayStr) {
    return { currentStreak, longestStreak, changed: false };
  }

  const nextStreak = lastActiveDate && daysBetween(lastActiveDate, todayStr) === 1 ? currentStreak + 1 : 1;
  const nextLongest = Math.max(longestStreak, nextStreak);

  return { currentStreak: nextStreak, longestStreak: nextLongest, changed: true };
}
