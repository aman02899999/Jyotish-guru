/** Subscription tiers and credit packs, ported from AstrologyViewModel.kt. Mock/demo pricing only - no real payment is processed. */

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  period: "week" | "month" | "year";
  description: string;
  iconSymbol: string;
  features: string[];
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "SubTier_Bronze",
    name: "Nakshatra Bronze",
    price: 199,
    period: "week",
    description:
      "Ideal for casual seekers. Free consultations with Pt. Vasudev Shastri, Aacharya Rohit Joshi and Siddharth Numerology. 10% discount on others.",
    iconSymbol: "🥉",
    features: [
      "Free general, career & numerology guidance",
      "10% discount on all other elite astrologers",
      "1 included follow-up question per consultation",
      "Fully simulated billing sandbox",
    ],
  },
  {
    id: "SubTier_Silver",
    name: "Rashifal Silver",
    price: 499,
    period: "month",
    description:
      "Best value for continuous spiritual growth. Free consultations with Pt. Vasudev Shastri, Aacharya Rohit Joshi, Meera Krishnan, Siddharth Numerology and Swami Anand Giri.",
    iconSymbol: "🥈",
    features: [
      "Free general, career, financial, numerology & karmic guidance",
      "25% discount on remaining premium guides",
      "1 included follow-up question per consultation",
      "Downloadable PDF reports",
    ],
  },
  {
    id: "SubTier_Gold",
    name: "Mahadasha Gold",
    price: 1999,
    period: "year",
    description: "The ultimate celestial alignment. Instant, completely free consultations across ALL 10 AI Astrologers.",
    iconSymbol: "🥇",
    features: [
      "100% Free consultations for all 10 specialized guides",
      "Priority fast report generation queue",
      "Unlimited consultations while subscribed",
      "Interactive gold-styled dashboard badging",
    ],
  },
];

export interface CreditsPack {
  id: string;
  name: string;
  price: number;
  creditsAmount: number;
  description: string;
  iconSymbol: string;
}

export const CREDITS_PACKS: CreditsPack[] = [
  {
    id: "credits_100",
    name: "Sadhaka Pack",
    price: 100,
    creditsAmount: 100,
    description: "Get ₹100 consultation credits to ask standard questions.",
    iconSymbol: "🕉️",
  },
  {
    id: "credits_500",
    name: "Purohit Pack",
    price: 450,
    creditsAmount: 500,
    description: "Get ₹500 consultation credits (includes ₹50 free bonus credits!).",
    iconSymbol: "🔱",
  },
  {
    id: "credits_1000",
    name: "Acharya Pack",
    price: 800,
    creditsAmount: 1000,
    description: "Get ₹1000 consultation credits (includes ₹200 mega bonus credits!).",
    iconSymbol: "👑",
  },
];
