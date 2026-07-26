import { describe, expect, it } from "vitest";
import { computeNextStreak } from "./streak";

describe("computeNextStreak", () => {
  it("first-ever visit starts a streak of 1", () => {
    expect(computeNextStreak(null, 0, 0, "2026-07-24")).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      changed: true,
    });
  });

  it("a same-day repeat visit changes nothing", () => {
    expect(computeNextStreak("2026-07-24", 5, 5, "2026-07-24")).toEqual({
      currentStreak: 5,
      longestStreak: 5,
      changed: false,
    });
  });

  it("a consecutive-day visit increments the streak", () => {
    expect(computeNextStreak("2026-07-23", 5, 5, "2026-07-24")).toEqual({
      currentStreak: 6,
      longestStreak: 6,
      changed: true,
    });
  });

  it("a gap of more than one day resets the streak to 1", () => {
    expect(computeNextStreak("2026-07-20", 10, 10, "2026-07-24")).toEqual({
      currentStreak: 1,
      longestStreak: 10,
      changed: true,
    });
  });

  it("preserves the longest streak even after a reset", () => {
    const result = computeNextStreak("2026-01-01", 30, 30, "2026-07-24");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(30);
  });

  it("a new streak that surpasses the old longest updates longestStreak", () => {
    const result = computeNextStreak("2026-07-23", 30, 20, "2026-07-24");
    expect(result.currentStreak).toBe(31);
    expect(result.longestStreak).toBe(31);
  });

  it("a visit in the future relative to lastActiveDate (clock skew) still resets rather than incrementing", () => {
    const result = computeNextStreak("2026-07-25", 5, 5, "2026-07-24");
    expect(result.currentStreak).toBe(1);
  });
});
