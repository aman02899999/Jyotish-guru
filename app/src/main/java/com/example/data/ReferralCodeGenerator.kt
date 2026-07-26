package com.example.data

/**
 * Generates the user-facing "ADI-XXXX" referral code from a display name.
 *
 * Extracted so the code shown on the Profile screen, the Daily Horoscope
 * share card, and the one actually credited in [referral simulation] logic
 * are always computed the same way instead of drifting out of sync.
 */
object ReferralCodeGenerator {
    private const val FALLBACK_NAME = "SEEKER"

    fun generate(name: String?): String {
        val cleaned = (name ?: "").uppercase().replace("[^A-Z0-9]".toRegex(), "")
        return "ADI-${cleaned.ifBlank { FALLBACK_NAME }}"
    }
}
