/**
 * Generates the user-facing "ADI-XXXX" referral code from a display name.
 * Ported from the Android app's ReferralCodeGenerator.kt so the code shown
 * is computed identically everywhere it's displayed.
 */

const FALLBACK_NAME = "SEEKER";

export function generateReferralCode(name: string | null | undefined): string {
  const cleaned = (name ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `ADI-${cleaned || FALLBACK_NAME}`;
}
