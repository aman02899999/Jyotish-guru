/**
 * Derives Panchang (Vedic almanac) elements - tithi, nakshatra, yoga, karana,
 * moon sign, Rahu Kaal, sunrise/sunset - from approximate mean sun/moon
 * ecliptic longitudes. Ported from the Android app's PanchangCalculator.kt;
 * see that file for the astronomical reasoning behind each formula.
 */

export interface PanchangElements {
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  moonSign: string;
  rahuKaal: string;
  sunrise: string;
  sunset: string;
}

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi (Ganesh Chaturthi)", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami (Ram Navami)", "Dashami",
  "Ekadashi (Shubh Vrat)", "Dwadashi", "Trayodashi (Pradosh)", "Chaturdashi",
  "Purnima (Full Moon / Sacred Day)", "Amavasya (New Moon / Pitru Day)",
];

const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
  "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
  "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purvashadha",
  "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
];

const YOGA_NAMES = [
  "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
  "Dhriti", "Shula", "Ganda", "Vridhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
  "Shukla", "Brahma", "Indra", "Vaidhriti",
];

// 7 movable karanas followed by the 4 fixed karanas (Shakuni, Chatushpada, Naga, Kinstughna)
const KARANA_NAMES = [
  "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti",
  "Shakuni", "Chatushpada", "Naga", "Kinstughna",
];

const MOON_SIGN_NAMES = [
  "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
  "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)",
];

// Traditional Rahu Kaal windows: the 2nd through 8th of the day's 8 daylight eighths.
const RAHU_KAAL_WINDOWS = [
  "07:30 AM - 09:00 AM", "09:00 AM - 10:30 AM", "10:30 AM - 12:00 PM",
  "12:00 PM - 01:30 PM", "01:30 PM - 03:00 PM", "03:00 PM - 04:30 PM",
  "04:30 PM - 06:00 PM",
];

// JS Date#getDay(): Sunday=0 .. Saturday=6 -> index into RAHU_KAAL_WINDOWS,
// per the classical rule: Mon=1st slot, Sat=2nd, Fri=3rd, Wed=4th, Thu=5th, Tue=6th, Sun=7th.
const RAHU_KAAL_INDEX_BY_WEEKDAY: Record<number, number> = {
  0: 6, // Sunday
  1: 0, // Monday
  2: 5, // Tuesday
  3: 3, // Wednesday
  4: 4, // Thursday
  5: 2, // Friday
  6: 1, // Saturday
};

/** Representative latitude (central India) used for the approximate sunrise/sunset model. */
const REFERENCE_LATITUDE_DEG = 22.0;

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatClockTime(hoursDecimal: number): string {
  const wrapped = ((hoursDecimal % 24) + 24) % 24;
  const totalMinutes = Math.round(wrapped * 60) % (24 * 60);
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const amPm = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${amPm}`;
}

/** Sidereal (Nirayana) mean solar longitude, in degrees. Shared with birth-chart-calculator.ts. */
export function sunSiderealLongitudeDeg(doy: number): number {
  const sunLong = ((doy - 104) * 360.0) / 365.256;
  return ((sunLong % 360) + 360) % 360;
}

/** Sidereal (Nirayana) mean lunar longitude, in degrees. Shared with birth-chart-calculator.ts. */
export function moonSiderealLongitudeDeg(daysSince2000: number): number {
  const moonLong = 180.0 + daysSince2000 * 13.1763;
  return ((moonLong % 360) + 360) % 360;
}

/** @param dateStr an ISO calendar date, e.g. "2026-07-22" */
export function calculatePanchang(dateStr: string): PanchangElements {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number.parseInt(yearStr, 10) || 2000;
  const month = clamp(Number.parseInt(monthStr, 10) || 1, 1, 12);
  const day = clamp(Number.parseInt(dayStr, 10) || 1, 1, 31);

  const doy = dayOfYear(year, month, day);
  // Local-noon reference date, used only to read the weekday.
  const weekday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();

  // Days since the 2000-01-01 epoch, at local noon, used for the mean-motion moon model.
  const daysSince2000 = (year - 2000) * 365.25 + doy + 0.5;

  const sunLong = sunSiderealLongitudeDeg(doy);
  const moonLong = moonSiderealLongitudeDeg(daysSince2000);

  let elongation = moonLong - sunLong;
  elongation = ((elongation % 360) + 360) % 360;
  elongation = clamp(elongation, 0, 359.999999);

  const tithiNumber = Math.floor(elongation / 12) + 1; // 1..30
  const dayInPaksha = tithiNumber <= 15 ? tithiNumber : tithiNumber - 15;
  let tithiIndex: number;
  if (dayInPaksha === 15 && tithiNumber <= 15) {
    tithiIndex = 14; // Purnima
  } else if (dayInPaksha === 15) {
    tithiIndex = 15; // Amavasya
  } else {
    tithiIndex = dayInPaksha - 1;
  }

  const nakshatraIndex = clamp(Math.floor(moonLong / (360 / 27)), 0, 26);

  let yogaSum = sunLong + moonLong;
  yogaSum = ((yogaSum % 360) + 360) % 360;
  const yogaIndex = clamp(Math.floor(yogaSum / (360 / 27)), 0, 26);

  const halfTithi = clamp(Math.floor(elongation / 6), 0, 59);
  let karanaIndex: number;
  if (halfTithi === 0) karanaIndex = 10; // Kinstughna
  else if (halfTithi === 57) karanaIndex = 7; // Shakuni
  else if (halfTithi === 58) karanaIndex = 8; // Chatushpada
  else if (halfTithi === 59) karanaIndex = 9; // Naga
  else karanaIndex = (halfTithi - 1) % 7; // Bava..Vishti

  const moonSignIndex = clamp(Math.floor(moonLong / 30), 0, 11);

  const rahuKaalIndex = RAHU_KAAL_INDEX_BY_WEEKDAY[weekday] ?? 0;

  const declinationDeg = 23.44 * Math.sin(((360 / 365) * (284 + doy) * Math.PI) / 180);
  const cosHourAngle = clamp(
    -Math.tan((REFERENCE_LATITUDE_DEG * Math.PI) / 180) * Math.tan((declinationDeg * Math.PI) / 180),
    -1,
    1
  );
  const hourAngleDeg = (Math.acos(cosHourAngle) * 180) / Math.PI;
  const dayLengthHours = (2 * hourAngleDeg) / 15;
  const sunriseHour = 12 - dayLengthHours / 2;
  const sunsetHour = 12 + dayLengthHours / 2;

  return {
    tithi: TITHI_NAMES[tithiIndex],
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex],
    yoga: YOGA_NAMES[yogaIndex],
    karana: KARANA_NAMES[karanaIndex],
    moonSign: MOON_SIGN_NAMES[moonSignIndex],
    rahuKaal: RAHU_KAAL_WINDOWS[rahuKaalIndex],
    sunrise: formatClockTime(sunriseHour),
    sunset: formatClockTime(sunsetHour),
  };
}

export function panchangExplanation(elements: PanchangElements, language: string): string {
  const { tithi, nakshatra, moonSign, rahuKaal } = elements;
  const lang = language.toLowerCase();

  if (lang === "hinglish") {
    let text = `Aaj ki tithi hai **${tithi}** aur Nakshatra **${nakshatra}** hai. `;
    if (tithi.includes("Ekadashi")) {
      text += "Ekadashi vrat aaj rakhne se mind clear hota hai aur health improve hoti hai. Meditation ke liye bohot hi shubh din hai.";
    } else if (tithi.includes("Purnima")) {
      text += "Purnima ke din moon energy peak par hoti hai. Spiritual acts, charity, aur family connections ke liye yeh din bohot hi auspicious hai.";
    } else if (tithi.includes("Amavasya")) {
      text += "Amavasya Pitru Tarpan aur meditation ke liye best hai. Aaj naye business ventures start karne se bachein.";
    } else if (tithi.includes("Chaturthi")) {
      text += "Chaturthi Bhagwan Ganesha ka din hai. Naye kaam start karne ke liye sabhi obstacles dur honge. Modak prasad chadhaein.";
    } else {
      text += `Aaj ka din ${tithi} tithi ke sath stability aur growth ke liye shubh hai. Rahu Kaal (${rahuKaal}) ke dauran important decisions lene se bachein.`;
    }
    text += ` Moon placement aaj **${moonSign}** mein hai, jo dynamic changes ko show karta hai.`;
    return text;
  }

  if (lang === "hindi" || lang === "हिन्दी") {
    let text = `आज की तिथि **${tithi}** है और नक्षत्र **${nakshatra}** है। `;
    if (tithi.includes("Ekadashi")) {
      text += "आज एकादशी व्रत रखने से मानसिक शांति मिलती है और स्वास्थ्य में सुधार होता है। ध्यान और जप के लिए यह अत्यंत उत्तम दिन है।";
    } else if (tithi.includes("Purnima")) {
      text += "पूर्णिमा के दिन चंद्र ऊर्जा अपने चरम पर होती है। आध्यात्मिक कार्यों, दान और पारिवारिक मेल-जोल के लिए यह दिन अत्यंत शुभ है।";
    } else if (tithi.includes("Amavasya")) {
      text += "अमावस्या पितृ पूजन और ध्यान के लिए सर्वोत्तम है। आज नए व्यावसायिक कार्य शुरू करने से बचें।";
    } else if (tithi.includes("Chaturthi")) {
      text += "चतुर्थी भगवान श्री गणेश का दिन है। विघ्न-बाधाओं को दूर करने के लिए भगवान गणेश की पूजा करें।";
    } else {
      text += `आज का दिन ${tithi} तिथि के प्रभाव से स्थिरता और प्रगति के लिए अनुकूल है। राहु काल (${rahuKaal}) के समय महत्वपूर्ण निर्णयों से बचें।`;
    }
    text += ` चंद्रमा आज **${moonSign}** राशि में संचरण कर रहे हैं।`;
    return text;
  }

  let text = `Today's auspicious tithi is **${tithi}** under the influence of **${nakshatra}** Nakshatra. `;
  if (tithi.includes("Ekadashi")) {
    text += "Observing Ekadashi fast today brings immense mental clarity and physiological rejuvenation. A highly auspicious day for deep meditation.";
  } else if (tithi.includes("Purnima")) {
    text += "The lunar energy is at its absolute peak on Purnima. Highly favorable for spiritual self-reflection, charity, and celebrating family bonds.";
  } else if (tithi.includes("Amavasya")) {
    text += "Amavasya is powerful for ancestral introspection and silent meditation. Avoid initiating major material ventures today.";
  } else if (tithi.includes("Chaturthi")) {
    text += "Chaturthi is dedicated to Lord Ganesha, the remover of obstacles. Pray and invoke His blessing for success in new assignments.";
  } else {
    text += `This day under the ${tithi} lunar phase promotes steady foundation, wellness, and self-care. It is recommended to avoid starting new critical ventures during Rahu Kaal (${rahuKaal}).`;
  }
  text += ` The Moon is currently placed in **${moonSign}**.`;
  return text;
}
