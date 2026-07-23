package com.example.data

import java.util.Calendar
import java.util.Locale
import kotlin.math.acos
import kotlin.math.sin
import kotlin.math.tan

/**
 * Resolved Panchang (Vedic almanac) elements for a given calendar date.
 */
data class PanchangElements(
    val tithi: String,
    val nakshatra: String,
    val yoga: String,
    val karana: String,
    val moonSign: String,
    val rahuKaal: String,
    val sunrise: String,
    val sunset: String
)

/**
 * Derives Panchang elements (tithi, nakshatra, yoga, karana, moon sign, Rahu
 * Kaal, sunrise/sunset) from approximate mean sun/moon ecliptic longitudes,
 * using the same mean-motion model as [Screens.kt]'s natal chart calculator.
 *
 * This is a simplified approximation (no true ephemeris, nutation, or
 * ayanamsa correction) intended for a demo app, but unlike a random guess it
 * is internally consistent and follows the real classical formulas:
 * tithi = elongation / 12 degrees, nakshatra = moon longitude / (360/27),
 * yoga = (sun + moon longitude) / (360/27), karana = half-tithi, and Rahu
 * Kaal follows the fixed traditional weekday -> daylight-eighth rule.
 */
object PanchangCalculator {

    private val tithiNames = listOf(
        "Pratipada", "Dwitiya", "Tritiya", "Chaturthi (Ganesh Chaturthi)", "Panchami",
        "Shashthi", "Saptami", "Ashtami", "Navami (Ram Navami)", "Dashami",
        "Ekadashi (Shubh Vrat)", "Dwadashi", "Trayodashi (Pradosh)", "Chaturdashi",
        "Purnima (Full Moon / Sacred Day)", "Amavasya (New Moon / Pitru Day)"
    )

    private val nakshatraNames = listOf(
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
        "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
        "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purvashadha",
        "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
        "Uttara Bhadrapada", "Revati"
    )

    private val yogaNames = listOf(
        "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
        "Dhriti", "Shula", "Ganda", "Vridhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
        "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
        "Shukla", "Brahma", "Indra", "Vaidhriti"
    )

    // 7 movable karanas followed by the 4 fixed karanas (Shakuni, Chatushpada, Naga, Kinstughna)
    private val karanaNames = listOf(
        "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti",
        "Shakuni", "Chatushpada", "Naga", "Kinstughna"
    )

    private val moonSignNames = listOf(
        "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
        "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
        "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
    )

    // Traditional Rahu Kaal windows: the 2nd through 8th of the day's 8 daylight eighths.
    private val rahuKaalWindows = listOf(
        "07:30 AM - 09:00 AM", "09:00 AM - 10:30 AM", "10:30 AM - 12:00 PM",
        "12:00 PM - 01:30 PM", "01:30 PM - 03:00 PM", "03:00 PM - 04:30 PM",
        "04:30 PM - 06:00 PM"
    )

    // Weekday (Calendar.DAY_OF_WEEK) -> index into rahuKaalWindows, per the classical rule:
    // Mon=1st slot, Sat=2nd, Fri=3rd, Wed=4th, Thu=5th, Tue=6th, Sun=7th.
    private val rahuKaalWindowIndexByWeekday = mapOf(
        Calendar.SUNDAY to 6,
        Calendar.MONDAY to 0,
        Calendar.TUESDAY to 5,
        Calendar.WEDNESDAY to 3,
        Calendar.THURSDAY to 4,
        Calendar.FRIDAY to 2,
        Calendar.SATURDAY to 1
    )

    /** Representative latitude (central India) used for the approximate sunrise/sunset model. */
    private const val REFERENCE_LATITUDE_DEG = 22.0

    fun calculate(dateStr: String): PanchangElements {
        val parts = dateStr.split("-")
        val year = parts.getOrNull(0)?.toIntOrNull() ?: 2000
        val month = parts.getOrNull(1)?.toIntOrNull() ?: 1
        val day = parts.getOrNull(2)?.toIntOrNull() ?: 1

        val cal = Calendar.getInstance()
        cal.clear()
        cal.set(year, (month - 1).coerceIn(0, 11), day.coerceIn(1, 31), 12, 0, 0)
        val dayOfYear = cal.get(Calendar.DAY_OF_YEAR)
        val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)

        // Days since the 2000-01-01 epoch, at local noon, used for the mean-motion moon model.
        val daysSince2000 = (year - 2000) * 365.25 + dayOfYear + 0.5

        var sunLong = ((dayOfYear - 104) * 360.0 / 365.256) % 360.0
        if (sunLong < 0) sunLong += 360.0

        var moonLong = (180.0 + daysSince2000 * 13.1763) % 360.0
        if (moonLong < 0) moonLong += 360.0

        var elongation = (moonLong - sunLong) % 360.0
        if (elongation < 0) elongation += 360.0
        elongation = elongation.coerceIn(0.0, 359.999999)

        val tithiNumber = (elongation / 12.0).toInt() + 1 // 1..30
        val dayInPaksha = if (tithiNumber <= 15) tithiNumber else tithiNumber - 15
        val tithiIndex = when {
            dayInPaksha == 15 && tithiNumber <= 15 -> 14 // Purnima
            dayInPaksha == 15 -> 15 // Amavasya
            else -> dayInPaksha - 1
        }

        val nakshatraIndex = (moonLong / (360.0 / 27.0)).toInt().coerceIn(0, 26)

        var yogaSum = (sunLong + moonLong) % 360.0
        if (yogaSum < 0) yogaSum += 360.0
        val yogaIndex = (yogaSum / (360.0 / 27.0)).toInt().coerceIn(0, 26)

        val halfTithi = (elongation / 6.0).toInt().coerceIn(0, 59)
        val karanaIndex = when (halfTithi) {
            0 -> 10 // Kinstughna
            57 -> 7 // Shakuni
            58 -> 8 // Chatushpada
            59 -> 9 // Naga
            else -> (halfTithi - 1) % 7 // Bava..Vishti
        }

        val moonSignIndex = (moonLong / 30.0).toInt().coerceIn(0, 11)

        val rahuKaalIndex = rahuKaalWindowIndexByWeekday[dayOfWeek] ?: 0

        val declinationDeg = 23.44 * sin(Math.toRadians(360.0 / 365.0 * (284 + dayOfYear)))
        val cosHourAngle = (-tan(Math.toRadians(REFERENCE_LATITUDE_DEG)) * tan(Math.toRadians(declinationDeg)))
            .coerceIn(-1.0, 1.0)
        val hourAngleDeg = Math.toDegrees(acos(cosHourAngle))
        val dayLengthHours = 2.0 * hourAngleDeg / 15.0
        val sunriseHour = 12.0 - dayLengthHours / 2.0
        val sunsetHour = 12.0 + dayLengthHours / 2.0

        return PanchangElements(
            tithi = tithiNames[tithiIndex],
            nakshatra = nakshatraNames[nakshatraIndex],
            yoga = yogaNames[yogaIndex],
            karana = karanaNames[karanaIndex],
            moonSign = moonSignNames[moonSignIndex],
            rahuKaal = rahuKaalWindows[rahuKaalIndex],
            sunrise = formatClockTime(sunriseHour),
            sunset = formatClockTime(sunsetHour)
        )
    }

    private fun formatClockTime(hoursDecimal: Double): String {
        val wrapped = ((hoursDecimal % 24.0) + 24.0) % 24.0
        val totalMinutes = Math.round(wrapped * 60.0).toInt() % (24 * 60)
        val hour24 = totalMinutes / 60
        val minute = totalMinutes % 60
        val amPm = if (hour24 < 12) "AM" else "PM"
        val hour12 = if (hour24 % 12 == 0) 12 else hour24 % 12
        return String.format(Locale.US, "%02d:%02d %s", hour12, minute, amPm)
    }
}
