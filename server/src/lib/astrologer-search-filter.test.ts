import { describe, expect, it } from "vitest";
import { filterAstrologers } from "./astrologer-search-filter";
import type { Astrologer } from "./astrologers";

function astrologer(id: number, name: string, specialty: string): Astrologer {
  return {
    id,
    name,
    specialty,
    style: "Traditional Vedic",
    price: 49,
    bio: "",
    languages: ["English"],
    iconSymbol: "🕉",
  };
}

const astrologers: Astrologer[] = [
  astrologer(1, "Pt. Vasudev Shastri", "General Kundli Reading"),
  astrologer(2, "Dr. Aruna Mukherji", "Marriage Matching"),
  astrologer(3, "Aacharya Rohit Joshi", "Career & Business Timing"),
];

describe("filterAstrologers", () => {
  it("returns everything for a blank query and null specialty", () => {
    expect(filterAstrologers(astrologers, "", null)).toEqual(astrologers);
  });

  it("matches name case-insensitively", () => {
    expect(filterAstrologers(astrologers, "vasudev", null)).toEqual([astrologers[0]]);
  });

  it("matches specialty case-insensitively", () => {
    expect(filterAstrologers(astrologers, "marriage", null)).toEqual([astrologers[1]]);
  });

  it("requires an exact specialty match for the specialty filter", () => {
    expect(filterAstrologers(astrologers, "", "Career & Business Timing")).toEqual([astrologers[2]]);
  });

  it("combines query and specialty filters with AND", () => {
    expect(filterAstrologers(astrologers, "Rohit", "Marriage Matching")).toEqual([]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterAstrologers(astrologers, "nonexistent astrologer", null)).toEqual([]);
  });
});
