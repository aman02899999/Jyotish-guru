package com.example.data

/**
 * Subscription-tier consultation pricing, extracted from the ViewModel so the
 * discount rules can be unit tested without an Android/Room context.
 */
object PricingCalculator {
    private val bronzeFreeAstrologerIds = setOf(1, 3, 6)
    private val silverFreeAstrologerIds = setOf(1, 3, 4, 6, 7)

    fun getConsultationPrice(astrologerId: Int, basePrice: Int, tier: String): Int {
        return when (tier) {
            "Mahadasha Gold" -> 0
            "Rashifal Silver" -> {
                if (astrologerId in silverFreeAstrologerIds) 0 else (basePrice * 0.75).toInt()
            }
            "Nakshatra Bronze" -> {
                if (astrologerId in bronzeFreeAstrologerIds) 0 else (basePrice * 0.90).toInt()
            }
            else -> basePrice
        }
    }
}
