package com.example.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PanchangCalculatorTest {

    private val validTithis = setOf(
        "Pratipada", "Dwitiya", "Tritiya", "Chaturthi (Ganesh Chaturthi)", "Panchami",
        "Shashthi", "Saptami", "Ashtami", "Navami (Ram Navami)", "Dashami",
        "Ekadashi (Shubh Vrat)", "Dwadashi", "Trayodashi (Pradosh)", "Chaturdashi",
        "Purnima (Full Moon / Sacred Day)", "Amavasya (New Moon / Pitru Day)"
    )

    @Test
    fun calculationIsDeterministicForTheSameDate() {
        val a = PanchangCalculator.calculate("2026-07-22")
        val b = PanchangCalculator.calculate("2026-07-22")
        assertEquals(a, b)
    }

    @Test
    fun tithiChangesAcrossSeveralDaysApart() {
        val day1 = PanchangCalculator.calculate("2026-01-01")
        val day5 = PanchangCalculator.calculate("2026-01-05")
        assertNotEquals(day1.tithi, day5.tithi)
    }

    @Test
    fun allResolvedElementsAreKnownValidNames() {
        for (day in 1..28) {
            val dateStr = "2026-03-%02d".format(day)
            val result = PanchangCalculator.calculate(dateStr)
            assertTrue("Unexpected tithi '${result.tithi}' for $dateStr", result.tithi in validTithis)
            assertTrue(result.nakshatra.isNotBlank())
            assertTrue(result.yoga.isNotBlank())
            assertTrue(result.karana.isNotBlank())
            assertTrue(result.moonSign.isNotBlank())
        }
    }

    @Test
    fun rahuKaalWindowIsTheSameOnTheSameWeekdayEveryWeek() {
        // Any two dates exactly 7 days apart always fall on the same weekday,
        // and Rahu Kaal is determined purely by weekday in this model.
        val weekA = PanchangCalculator.calculate("2026-01-05")
        val weekB = PanchangCalculator.calculate("2026-01-12")
        assertEquals(weekA.rahuKaal, weekB.rahuKaal)
    }

    @Test
    fun sunriseAndSunsetAreFormattedClockTimes() {
        val result = PanchangCalculator.calculate("2026-06-21")
        val clockPattern = Regex("""\d{2}:\d{2} (AM|PM)""")
        assertTrue(result.sunrise.matches(clockPattern))
        assertTrue(result.sunset.matches(clockPattern))
    }
}
