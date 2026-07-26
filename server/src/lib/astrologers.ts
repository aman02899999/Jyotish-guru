/** Static astrologer roster, ported from the Android app's Repository.kt. */

export interface Astrologer {
  id: number;
  name: string;
  specialty: string;
  style: "Traditional Vedic" | "Plain Modern Language";
  price: number;
  bio: string;
  languages: string[];
  iconSymbol: string;
}

export const ASTROLOGERS: Astrologer[] = [
  {
    id: 1,
    name: "Pt. Vasudev Shastri",
    specialty: "General Kundli Reading",
    style: "Traditional Vedic",
    price: 49,
    bio: "A third-generation Vedic scholar specializing in Lagna-Rashi charts, planetary strengths (Shadbala), and comprehensive life readings.",
    languages: ["Hindi", "English"],
    iconSymbol: "🕉",
  },
  {
    id: 2,
    name: "Dr. Aruna Mukherji",
    specialty: "Marriage Matching",
    style: "Traditional Vedic",
    price: 149,
    bio: "Over 25 years of experience in Guna Milan, analyzing Manglik Dosha, Nadi compatibility, and securing harmonious, lifelong marriages.",
    languages: ["Bengali", "Hindi", "English"],
    iconSymbol: "💑",
  },
  {
    id: 3,
    name: "Aacharya Rohit Joshi",
    specialty: "Career & Business Timing",
    style: "Traditional Vedic",
    price: 99,
    bio: "Vedic scholar expert in pinpointing professional promotions, business expansion, and career transits using Mahadasha cycles.",
    languages: ["Hindi", "Gujarati", "English"],
    iconSymbol: "💼",
  },
  {
    id: 4,
    name: "Meera Krishnan",
    specialty: "Finance & Wealth (Muhurat)",
    style: "Plain Modern Language",
    price: 79,
    bio: "Modern financial astrologer specializing in auspicious timings (Muhurats) for business launches, investments, and wealth-building yogas.",
    languages: ["Tamil", "English"],
    iconSymbol: "💰",
  },
  {
    id: 5,
    name: "Rajesh Vastu Guru",
    specialty: "Vastu & Property",
    style: "Traditional Vedic",
    price: 199,
    bio: "Guiding real estate purchases, home layouts, and energetic corrections using Vastu Purusha principles to bring health and abundance.",
    languages: ["Hindi", "Punjabi", "English"],
    iconSymbol: "🏠",
  },
  {
    id: 6,
    name: "Siddharth Numerology",
    specialty: "Numerology & Destiny",
    style: "Plain Modern Language",
    price: 19,
    bio: "Unveil your Life Path, Destiny, and Soul numbers. Get quick, practical insights on name vibrations and lucky calendar dates.",
    languages: ["English", "Hindi"],
    iconSymbol: "🔢",
  },
  {
    id: 7,
    name: "Swami Anand Giri",
    specialty: "Spiritual & Karmic Path",
    style: "Traditional Vedic",
    price: 129,
    bio: "Understand your soul's blueprint, past life debts, and active karmic blockages. Focused on inner peace, meditation guidance, and Moksha path.",
    languages: ["Sanskrit", "Hindi", "English"],
    iconSymbol: "🧘",
  },
  {
    id: 8,
    name: "Nisha Deshmukh",
    specialty: "Health & Wellness (Ayur-Astrology)",
    style: "Plain Modern Language",
    price: 59,
    bio: "Integrates Vedic charts with Ayurvedic dosha types. Offers advice on ideal routines, dietary adjustments, and preventative wellness timing.",
    languages: ["Marathi", "Hindi", "English"],
    iconSymbol: "🌱",
  },
  {
    id: 9,
    name: "Devika Roy",
    specialty: "Foreign Travel & Settlement",
    style: "Plain Modern Language",
    price: 89,
    bio: "Specializes in Rahu-Ketu travel transits, analyzing overseas immigration prospects, visa approval windows, and global job shifts.",
    languages: ["Bengali", "English"],
    iconSymbol: "✈️",
  },
  {
    id: 10,
    name: "Aarav Singhal",
    specialty: "Academic & Exam Success",
    style: "Plain Modern Language",
    price: 39,
    bio: "Empowering students in stream selection, tracking educational focus blocks, and analyzing favorable periods for competitive exams.",
    languages: ["English", "Hindi"],
    iconSymbol: "🎓",
  },
];

export function getAstrologerById(id: number): Astrologer | undefined {
  return ASTROLOGERS.find((a) => a.id === id);
}
