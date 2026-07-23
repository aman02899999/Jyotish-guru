package com.example.data

import org.junit.Assert.assertEquals
import org.junit.Test

class AstrologerSearchFilterTest {

    private fun astrologer(id: Int, name: String, specialty: String) = Astrologer(
        id = id,
        name = name,
        specialty = specialty,
        style = "Traditional Vedic",
        price = 49,
        bio = "",
        languages = listOf("English"),
        averageRating = null,
        totalSessions = 0,
        iconSymbol = "🕉"
    )

    private val astrologers = listOf(
        astrologer(1, "Pt. Vasudev Shastri", "General Kundli Reading"),
        astrologer(2, "Dr. Aruna Mukherji", "Marriage Matching"),
        astrologer(3, "Aacharya Rohit Joshi", "Career & Business Timing")
    )

    @Test
    fun blankQueryAndNullSpecialtyReturnsEverything() {
        assertEquals(astrologers, AstrologerSearchFilter.apply(astrologers, "", null))
    }

    @Test
    fun queryMatchesNameCaseInsensitively() {
        val result = AstrologerSearchFilter.apply(astrologers, "vasudev", null)
        assertEquals(listOf(astrologers[0]), result)
    }

    @Test
    fun queryMatchesSpecialtyCaseInsensitively() {
        val result = AstrologerSearchFilter.apply(astrologers, "marriage", null)
        assertEquals(listOf(astrologers[1]), result)
    }

    @Test
    fun specialtyFilterRequiresExactMatch() {
        val result = AstrologerSearchFilter.apply(astrologers, "", "Career & Business Timing")
        assertEquals(listOf(astrologers[2]), result)
    }

    @Test
    fun queryAndSpecialtyFilterCombineWithAnd() {
        val result = AstrologerSearchFilter.apply(astrologers, "Rohit", "Marriage Matching")
        assertEquals(emptyList<Astrologer>(), result)
    }

    @Test
    fun noMatchesReturnsEmptyList() {
        val result = AstrologerSearchFilter.apply(astrologers, "nonexistent astrologer", null)
        assertEquals(emptyList<Astrologer>(), result)
    }
}
