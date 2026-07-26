/**
 * Subscription-tier consultation pricing. Ported from the Android app's
 * PricingCalculator.kt so the discount rules stay identical across platforms.
 */

const BRONZE_FREE_ASTROLOGER_IDS = new Set([1, 3, 6]);
const SILVER_FREE_ASTROLOGER_IDS = new Set([1, 3, 4, 6, 7]);

export function getConsultationPrice(
  astrologerId: number,
  basePrice: number,
  tier: string
): number {
  switch (tier) {
    case "Mahadasha Gold":
      return 0;
    case "Rashifal Silver":
      return SILVER_FREE_ASTROLOGER_IDS.has(astrologerId) ? 0 : Math.floor(basePrice * 0.75);
    case "Nakshatra Bronze":
      return BRONZE_FREE_ASTROLOGER_IDS.has(astrologerId) ? 0 : Math.floor(basePrice * 0.9);
    default:
      return basePrice;
  }
}
