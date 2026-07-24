/**
 * Ashtakoot Guna Milan: the classical 8-factor, 36-point Vedic marriage
 * compatibility system, computed from each partner's Moon Nakshatra and
 * Moon Rashi (sign) at birth. Reuses the same sidereal Moon longitude model
 * as panchang-calculator.ts/birth-chart-calculator.ts for consistency.
 *
 * This is presented as guidance/entertainment, not a substitute for a full
 * consultation - some of the classical lookup tables (Yoni compatibility,
 * Vashya groupings) are simplified to whole-nakshatra/whole-sign rules here
 * rather than every regional tradition's finer exceptions.
 */
import { moonSiderealLongitudeDeg } from "./panchang-calculator";

export interface Koota {
  name: string;
  points: number;
  maxPoints: number;
  description: string;
}

export interface GunaMilanResult {
  totalPoints: number;
  maxPoints: 36;
  verdict: string;
  kootas: Koota[];
}

const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purvashadha",
  "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

function moonPlacement(dob: string): { nakshatraIndex: number; rashiIndex: number } {
  const [yearStr, monthStr, dayStr] = dob.split("-");
  const year = Number.parseInt(yearStr, 10) || 2000;
  const month = Math.min(Math.max(Number.parseInt(monthStr, 10) || 1, 1), 12);
  const day = Math.min(Math.max(Number.parseInt(dayStr, 10) || 1, 1), 31);
  const doy = dayOfYear(year, month, day);
  const daysSince2000 = (year - 2000) * 365.25 + doy + 0.5;
  const moonLong = moonSiderealLongitudeDeg(daysSince2000);
  return {
    nakshatraIndex: Math.floor(moonLong / (360 / 27)),
    rashiIndex: Math.floor(moonLong / 30),
  };
}

// --- Varna (1 point): social-temperament hierarchy by rashi ---
const VARNA_RANK = [1, 2, 0, 3, 1, 2, 0, 3, 1, 2, 0, 3]; // Kshatriya=1,Vaishya=2,Brahmin=3,Shudra=0 rank per rashi 0..11
function varnaKoota(rashi1: number, rashi2: number): Koota {
  const points = VARNA_RANK[rashi1] >= VARNA_RANK[rashi2] ? 1 : 0;
  return {
    name: "Varna",
    points,
    maxPoints: 1,
    description: "Spiritual/temperament compatibility, based on each partner's Moon sign.",
  };
}

// --- Vashya (2 points): whole-sign dominance/control groups ---
const VASHYA_GROUP = [0, 0, 1, 2, 1, 1, 1, 3, 0, 0, 1, 2]; // 0=Chatushpada,1=Manav,2=Jalchar,3=Vanchar (simplified, whole-sign)
const VASHYA_COMPATIBLE: Record<number, Set<number>> = {
  0: new Set([0, 1]),
  1: new Set([0, 1, 2]),
  2: new Set([1, 2]),
  3: new Set([3]),
};
function vashyaKoota(rashi1: number, rashi2: number): Koota {
  const g1 = VASHYA_GROUP[rashi1];
  const g2 = VASHYA_GROUP[rashi2];
  const points = g1 === g2 ? 2 : VASHYA_COMPATIBLE[g1]?.has(g2) ? 1 : 0;
  return { name: "Vashya", points, maxPoints: 2, description: "Mutual influence and attraction between partners." };
}

// --- Tara (3 points): birth-star counting, checked both directions ---
function taraAuspicious(fromIndex: number, toIndex: number): boolean {
  const count = ((toIndex - fromIndex + 27) % 27) + 1; // 1..27
  const remainder = ((count - 1) % 9) + 1; // 1..9
  // Janma(1), Vipat(3), Pratyak(5), Vadha(7) are inauspicious positions.
  return ![1, 3, 5, 7].includes(remainder);
}
function taraKoota(nak1: number, nak2: number): Koota {
  const forward = taraAuspicious(nak1, nak2);
  const backward = taraAuspicious(nak2, nak1);
  const points = forward && backward ? 3 : forward || backward ? 1.5 : 0;
  return { name: "Tara", points, maxPoints: 3, description: "Birth-star counting for health and general wellbeing." };
}

// --- Yoni (4 points): animal-symbol instinctual compatibility ---
const YONI_ANIMAL = [
  "Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog", "Cat", "Sheep", "Cat", "Rat",
  "Rat", "Cow", "Buffalo", "Tiger", "Buffalo", "Tiger", "Deer", "Deer", "Dog", "Monkey",
  "Mongoose", "Monkey", "Lion", "Horse", "Lion", "Cow", "Elephant",
];
const YONI_ENEMIES: Record<string, Set<string>> = {
  Cow: new Set(["Tiger"]), Tiger: new Set(["Cow"]),
  Horse: new Set(["Buffalo"]), Buffalo: new Set(["Horse"]),
  Elephant: new Set(["Lion"]), Lion: new Set(["Elephant"]),
  Dog: new Set(["Deer"]), Deer: new Set(["Dog"]),
  Serpent: new Set(["Mongoose"]), Mongoose: new Set(["Serpent"]),
  Rat: new Set(["Cat"]), Cat: new Set(["Rat"]),
  Sheep: new Set(["Monkey"]), Monkey: new Set(["Sheep"]),
};
function yoniKoota(nak1: number, nak2: number): Koota {
  const a1 = YONI_ANIMAL[nak1];
  const a2 = YONI_ANIMAL[nak2];
  let points: number;
  if (a1 === a2) points = 4;
  else if (YONI_ENEMIES[a1]?.has(a2)) points = 0;
  else points = 2;
  return { name: "Yoni", points, maxPoints: 4, description: "Physical and instinctual compatibility." };
}

// --- Graha Maitri (5 points): friendship between the two Moon-sign lords ---
const RASHI_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
const PLANET_FRIENDS: Record<string, Set<string>> = {
  Sun: new Set(["Moon", "Mars", "Jupiter"]),
  Moon: new Set(["Sun", "Mercury"]),
  Mars: new Set(["Sun", "Moon", "Jupiter"]),
  Mercury: new Set(["Sun", "Venus"]),
  Jupiter: new Set(["Sun", "Moon", "Mars"]),
  Venus: new Set(["Mercury", "Saturn"]),
  Saturn: new Set(["Mercury", "Venus"]),
};
const PLANET_ENEMIES: Record<string, Set<string>> = {
  Sun: new Set(["Venus", "Saturn"]),
  Moon: new Set([]),
  Mars: new Set(["Mercury"]),
  Mercury: new Set(["Moon"]),
  Jupiter: new Set(["Mercury", "Venus"]),
  Venus: new Set(["Sun", "Moon"]),
  Saturn: new Set(["Sun", "Moon", "Mars"]),
};
function relationOf(p1: string, p2: string): "friend" | "enemy" | "neutral" {
  if (p1 === p2) return "friend";
  if (PLANET_FRIENDS[p1]?.has(p2)) return "friend";
  if (PLANET_ENEMIES[p1]?.has(p2)) return "enemy";
  return "neutral";
}
function grahaMaitriKoota(rashi1: number, rashi2: number): Koota {
  const lord1 = RASHI_LORD[rashi1];
  const lord2 = RASHI_LORD[rashi2];
  const r1 = relationOf(lord1, lord2);
  const r2 = relationOf(lord2, lord1);
  let points: number;
  if (r1 === "friend" && r2 === "friend") points = 5;
  else if (r1 === "enemy" && r2 === "enemy") points = 0;
  else if (r1 === "enemy" || r2 === "enemy") points = 1;
  else if (r1 === "friend" || r2 === "friend") points = 4;
  else points = 3;
  return { name: "Graha Maitri", points, maxPoints: 5, description: "Mental and intellectual compatibility." };
}

// --- Gana (6 points): temperament group (Deva/Manushya/Rakshasa) ---
const DEVA_GANA = new Set([0, 4, 6, 7, 12, 14, 16, 21, 26]);
const MANUSHYA_GANA = new Set([1, 3, 5, 10, 11, 19, 20, 24, 25]);
function ganaOf(nak: number): "Deva" | "Manushya" | "Rakshasa" {
  if (DEVA_GANA.has(nak)) return "Deva";
  if (MANUSHYA_GANA.has(nak)) return "Manushya";
  return "Rakshasa";
}
function ganaKoota(nak1: number, nak2: number): Koota {
  const g1 = ganaOf(nak1);
  const g2 = ganaOf(nak2);
  let points: number;
  if (g1 === g2) points = 6;
  else if ((g1 === "Deva" && g2 === "Manushya") || (g1 === "Manushya" && g2 === "Deva")) points = 5;
  else if (g1 === "Deva" && g2 === "Rakshasa") points = 1;
  else if (g1 === "Rakshasa" && g2 === "Deva") points = 0;
  else points = 0; // Manushya <-> Rakshasa, either order
  return { name: "Gana", points, maxPoints: 6, description: "Temperament and behavioral compatibility." };
}

// --- Bhakoot (7 points): rashi-distance dosha check ---
function bhakootKoota(rashi1: number, rashi2: number): Koota {
  const distance = ((rashi2 - rashi1 + 12) % 12) + 1; // 1..12
  const doshaDistances = new Set([2, 12, 5, 9, 6, 8]);
  const points = doshaDistances.has(distance) ? 0 : 7;
  return { name: "Bhakoot", points, maxPoints: 7, description: "Overall relationship harmony and family prosperity." };
}

// --- Nadi (8 points): most heavily weighted - biological/genetic compatibility ---
const NADI_TYPE = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2]; // 0=Aadi,1=Madhya,2=Antya
function nadiKoota(nak1: number, nak2: number): Koota {
  const points = NADI_TYPE[nak1] === NADI_TYPE[nak2] ? 0 : 8;
  return { name: "Nadi", points, maxPoints: 8, description: "Health and genetic compatibility of future offspring - the most heavily weighted factor." };
}

function verdictFor(total: number): string {
  if (total >= 32) return "Excellent match - highly recommended by classical standards.";
  if (total >= 24) return "Good match - a favorable compatibility score.";
  if (total >= 18) return "Average match - workable, best discussed with an astrologer.";
  return "Below-average match by this classical system - a detailed consultation is strongly advised before proceeding.";
}

export function calculateGunaMilan(dob1: string, dob2: string): GunaMilanResult {
  const p1 = moonPlacement(dob1);
  const p2 = moonPlacement(dob2);

  const kootas = [
    varnaKoota(p1.rashiIndex, p2.rashiIndex),
    vashyaKoota(p1.rashiIndex, p2.rashiIndex),
    taraKoota(p1.nakshatraIndex, p2.nakshatraIndex),
    yoniKoota(p1.nakshatraIndex, p2.nakshatraIndex),
    grahaMaitriKoota(p1.rashiIndex, p2.rashiIndex),
    ganaKoota(p1.nakshatraIndex, p2.nakshatraIndex),
    bhakootKoota(p1.rashiIndex, p2.rashiIndex),
    nadiKoota(p1.nakshatraIndex, p2.nakshatraIndex),
  ];

  const totalPoints = kootas.reduce((sum, k) => sum + k.points, 0);

  return {
    totalPoints,
    maxPoints: 36,
    verdict: verdictFor(totalPoints),
    kootas,
  };
}

export function moonNakshatraName(dob: string): string {
  return NAKSHATRA_NAMES[moonPlacement(dob).nakshatraIndex];
}
