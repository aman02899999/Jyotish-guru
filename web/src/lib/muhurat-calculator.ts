/**
 * Muhurat (auspicious timing) finder, built on the classical Panchanga
 * tithi-position system: each of the 15 tithis in a paksha falls into one
 * of 5 categories - Nanda, Bhadra, Jaya, Rikta, Purna - repeating for both
 * the waxing (Shukla) and waning (Krishna) half of the lunar month. This is
 * the same rule Muhurat Shastra uses generically across activity types, so
 * unlike activity-specific override tables (which vary a lot by regional
 * tradition and are easy to get subtly wrong), this one system is applied
 * consistently here. Amavasya is flagged as a caution despite falling in
 * the "Purna" position, per the classical exception most texts note.
 */
import { calculatePanchang, type PanchangElements } from "./panchang-calculator";

export type MuhuratRating = "Highly Auspicious" | "Auspicious" | "Use Caution";

export interface MuhuratDay {
  date: string;
  rating: MuhuratRating;
  tithiCategory: string;
  reason: string;
  panchang: PanchangElements;
}

export interface ActivityType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: "marriage", name: "Marriage / Engagement", icon: "💍", description: "Weddings, engagements, and marital ceremonies" },
  { id: "travel", name: "Travel / Relocation", icon: "✈️", description: "Journeys, moving house, or relocating cities" },
  { id: "business", name: "Business Launch", icon: "🏢", description: "Starting a company, shop opening, new venture" },
  { id: "property", name: "Property Purchase", icon: "🏡", description: "Buying property, Griha Pravesh (housewarming)" },
  { id: "vehicle", name: "Vehicle Purchase", icon: "🚗", description: "Buying a new car, bike, or other vehicle" },
  { id: "education", name: "Education / Learning", icon: "📚", description: "Starting a course, exams, admissions" },
];

const TITHI_CATEGORY_NAMES = ["Nanda", "Bhadra", "Jaya", "Rikta", "Purna"];

function tithiCategoryFromName(tithiName: string): { category: string; positionInPaksha: number } {
  // TITHI_NAMES in panchang-calculator.ts runs Pratipada(1)..Chaturdashi(14),
  // then Purnima(15 of Shukla)/Amavasya(15 of Krishna) share index 14/15.
  const baseNames = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
    "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
  ];
  let position = baseNames.findIndex((n) => tithiName.startsWith(n)) + 1;
  if (position === 0) position = 15; // Purnima or Amavasya - both the 15th tithi of their paksha
  const category = TITHI_CATEGORY_NAMES[(position - 1) % 5];
  return { category, positionInPaksha: position };
}

function rateDay(elements: PanchangElements): { rating: MuhuratRating; tithiCategory: string; reason: string } {
  const { category } = tithiCategoryFromName(elements.tithi);
  const isAmavasya = elements.tithi.includes("Amavasya");

  if (isAmavasya) {
    return {
      rating: "Use Caution",
      tithiCategory: category,
      reason: "Amavasya is traditionally reserved for ancestral rites and introspection - most texts advise against starting new ventures on this day.",
    };
  }
  if (category === "Rikta") {
    return {
      rating: "Use Caution",
      tithiCategory: category,
      reason: "This falls on a Rikta (\"empty\") tithi, classically considered unfavorable for beginning new undertakings.",
    };
  }
  if (category === "Purna") {
    return {
      rating: "Highly Auspicious",
      tithiCategory: category,
      reason: "A Purna (\"complete\") tithi - among the most favorable in the lunar cycle for important beginnings.",
    };
  }
  return {
    rating: "Auspicious",
    tithiCategory: category,
    reason: `A ${category} tithi - a generally favorable day, well-suited for auspicious activities.`,
  };
}

/** @param startDateStr "YYYY-MM-DD" */
export function findMuhuratWindow(startDateStr: string, days: number): MuhuratDay[] {
  const results: MuhuratDay[] = [];
  const start = new Date(`${startDateStr}T12:00:00Z`);

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const elements = calculatePanchang(dateStr);
    const { rating, tithiCategory, reason } = rateDay(elements);
    results.push({ date: dateStr, rating, tithiCategory, reason, panchang: elements });
  }

  return results;
}
