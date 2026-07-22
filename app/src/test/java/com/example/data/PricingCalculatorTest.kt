package com.example.data

import org.junit.Assert.assertEquals
import org.junit.Test

class PricingCalculatorTest {

    @Test
    fun goldTierIsAlwaysFree() {
        assertEquals(0, PricingCalculator.getConsultationPrice(astrologerId = 2, basePrice = 199, tier = "Mahadasha Gold"))
        assertEquals(0, PricingCalculator.getConsultationPrice(astrologerId = 9, basePrice = 39, tier = "Mahadasha Gold"))
    }

    @Test
    fun silverTierWaivesPriceForItsBundledAstrologers() {
        listOf(1, 3, 4, 6, 7).forEach { id ->
            assertEquals(0, PricingCalculator.getConsultationPrice(id, 100, "Rashifal Silver"))
        }
    }

    @Test
    fun silverTierApplies25PercentDiscountToOtherAstrologers() {
        assertEquals(75, PricingCalculator.getConsultationPrice(astrologerId = 5, basePrice = 100, tier = "Rashifal Silver"))
        assertEquals(149, PricingCalculator.getConsultationPrice(astrologerId = 2, basePrice = 199, tier = "Rashifal Silver"))
    }

    @Test
    fun bronzeTierWaivesPriceForItsBundledAstrologers() {
        listOf(1, 3, 6).forEach { id ->
            assertEquals(0, PricingCalculator.getConsultationPrice(id, 100, "Nakshatra Bronze"))
        }
    }

    @Test
    fun bronzeTierApplies10PercentDiscountToOtherAstrologers() {
        assertEquals(90, PricingCalculator.getConsultationPrice(astrologerId = 5, basePrice = 100, tier = "Nakshatra Bronze"))
        assertEquals(179, PricingCalculator.getConsultationPrice(astrologerId = 2, basePrice = 199, tier = "Nakshatra Bronze"))
    }

    @Test
    fun freeTierAlwaysChargesTheFullBasePrice() {
        assertEquals(199, PricingCalculator.getConsultationPrice(astrologerId = 2, basePrice = 199, tier = "Free"))
        assertEquals(49, PricingCalculator.getConsultationPrice(astrologerId = 1, basePrice = 49, tier = "Free"))
    }
}
