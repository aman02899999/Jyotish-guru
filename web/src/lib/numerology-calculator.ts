/**
 * Pythagorean/Vedic numerology: Life Path (from date of birth) and Destiny
 * (from full name) numbers, reduced to a single digit unless a master
 * number (11, 22, 33) appears along the way. Ruling planet, lucky day, and
 * trait text use the fully-reduced digit (1-9), since master numbers don't
 * have their own classical planetary rulership in this system.
 */

export interface NumerologyProfile {
  lifePathNumber: number; // 1-9, or 11/22/33
  destinyNumber: number; // 1-9, or 11/22/33
  rulingPlanet: string;
  luckyDay: string;
  luckyColor: string;
  traits: string;
}

const LETTER_VALUES: Record<string, number> = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};

const MASTER_NUMBERS = new Set([11, 22, 33]);

const RULING_PLANET: Record<number, string> = {
  1: "Surya (Sun)", 2: "Chandra (Moon)", 3: "Guru (Jupiter)", 4: "Rahu",
  5: "Budh (Mercury)", 6: "Shukra (Venus)", 7: "Ketu", 8: "Shani (Saturn)", 9: "Mangal (Mars)",
};

const LUCKY_DAY: Record<number, string> = {
  1: "Sunday", 2: "Monday", 3: "Thursday", 4: "Sunday",
  5: "Wednesday", 6: "Friday", 7: "Monday", 8: "Saturday", 9: "Tuesday",
};

const LUCKY_COLOR: Record<number, string> = {
  1: "Gold", 2: "White", 3: "Yellow", 4: "Grey",
  5: "Emerald Green", 6: "Pastel Pink", 7: "Sea Green", 8: "Royal Blue", 9: "Red",
};

const TRAITS: Record<number, string> = {
  1: "A natural leader - independent, ambitious, and driven to pioneer new paths. Thrives when trusted to lead.",
  2: "Diplomatic and intuitive - a natural peacemaker who values harmony, partnership, and emotional depth.",
  3: "Expressive and creative - drawn to art, communication, and joy. Radiates optimism wherever you go.",
  4: "Grounded and disciplined - the reliable builder who values structure, hard work, and long-term stability.",
  5: "Adventurous and freedom-loving - adaptable, curious, and energized by change and new experiences.",
  6: "Nurturing and responsible - a natural caretaker drawn to home, family, and service to others.",
  7: "Analytical and introspective - a seeker of deeper truth, drawn to spirituality, study, and solitude.",
  8: "Ambitious and resourceful - a natural achiever with strong instincts for material and financial success.",
  9: "Compassionate and idealistic - a humanitarian at heart, generous, wise, and driven to serve a greater cause.",
  11: "A master intuitive - highly sensitive and inspirational, walking the line between the practical (2) and the visionary.",
  22: "The master builder - capable of turning grand visions into lasting real-world achievements.",
  33: "The master teacher - a rare, deeply compassionate guide devoted to uplifting others.",
};

function reduceToLifePathDigit(sum: number): number {
  let n = sum;
  while (n > 9 && !MASTER_NUMBERS.has(n)) {
    n = String(n)
      .split("")
      .reduce((acc, digit) => acc + Number.parseInt(digit, 10), 0);
  }
  return n;
}

function fullyReduce(n: number): number {
  let result = n;
  while (result > 9) {
    result = String(result)
      .split("")
      .reduce((acc, digit) => acc + Number.parseInt(digit, 10), 0);
  }
  return result;
}

/** @param dob "YYYY-MM-DD" */
export function calculateLifePathNumber(dob: string): number {
  const digitSum = dob
    .replace(/-/g, "")
    .split("")
    .reduce((acc, ch) => acc + (Number.parseInt(ch, 10) || 0), 0);
  return reduceToLifePathDigit(digitSum);
}

export function calculateDestinyNumber(fullName: string): number {
  const letterSum = fullName
    .toLowerCase()
    .split("")
    .reduce((acc, ch) => acc + (LETTER_VALUES[ch] ?? 0), 0);
  return reduceToLifePathDigit(letterSum);
}

export function calculateNumerologyProfile(fullName: string, dob: string): NumerologyProfile {
  const lifePathNumber = calculateLifePathNumber(dob);
  const destinyNumber = calculateDestinyNumber(fullName || "Seeker");

  const rulingDigit = fullyReduce(lifePathNumber);

  return {
    lifePathNumber,
    destinyNumber,
    rulingPlanet: RULING_PLANET[rulingDigit],
    luckyDay: LUCKY_DAY[rulingDigit],
    luckyColor: LUCKY_COLOR[rulingDigit],
    traits: TRAITS[lifePathNumber] ?? TRAITS[rulingDigit],
  };
}
