import { describe, expect, it } from "vitest";
import { displayName } from "./review-display-name";

describe("displayName", () => {
  it("shortens a full name to first name + last initial", () => {
    expect(displayName("Aman Sharma")).toBe("Aman S.");
  });

  it("handles a single-word name as-is", () => {
    expect(displayName("Priya")).toBe("Priya");
  });

  it("uses the last of multiple middle names for the initial", () => {
    expect(displayName("Rohit Kumar Joshi")).toBe("Rohit J.");
  });

  it("collapses extra whitespace", () => {
    expect(displayName("  Meera   Krishnan  ")).toBe("Meera K.");
  });

  it("falls back to a generic label for an empty name", () => {
    expect(displayName("")).toBe("A Seeker");
    expect(displayName("   ")).toBe("A Seeker");
  });
});
