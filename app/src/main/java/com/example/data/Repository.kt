package com.example.data

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// --- Astrologer Data Model ---

data class Astrologer(
    val id: Int,
    val name: String,
    val specialty: String,
    val style: String, // "Traditional Vedic" or "Plain Modern"
    val price: Int, // In ₹
    val bio: String,
    val languages: List<String>,
    val averageRating: Double?, // null means "New"
    val totalSessions: Int,
    val iconSymbol: String // e.g. "🕉", "🌙", "☀️", "🔮", "🎡", "⚖️", "🏠", "🌱", "✈️", "🎓"
)

// --- Astrology Repository ---

class AstrologyRepository(private val dao: AstrologyDao) {

    // Hardcoded initial list of 10 Astrologers
    private val baseAstrologers = listOf(
        Astrologer(
            id = 1,
            name = "Pt. Vasudev Shastri",
            specialty = "General Kundli Reading",
            style = "Traditional Vedic",
            price = 49,
            bio = "A third-generation Vedic scholar specializing in Lagna-Rashi charts, planetary strengths (Shadbala), and comprehensive life readings.",
            languages = listOf("Hindi", "English"),
            averageRating = null, // Dynamically computed
            totalSessions = 0,
            iconSymbol = "🕉"
        ),
        Astrologer(
            id = 2,
            name = "Dr. Aruna Mukherji",
            specialty = "Marriage Matching",
            style = "Traditional Vedic",
            price = 149,
            bio = "Over 25 years of experience in Guna Milan, analyzing Manglik Dosha, Nadi compatibility, and securing harmonious, lifelong marriages.",
            languages = listOf("Bengali", "Hindi", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "💑"
        ),
        Astrologer(
            id = 3,
            name = "Aacharya Rohit Joshi",
            specialty = "Career & Business Timing",
            style = "Traditional Vedic",
            price = 99,
            bio = "Vedic scholar expert in pinpointing professional promotions, business expansion, and career transits using Mahadasha cycles.",
            languages = listOf("Hindi", "Gujarati", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "💼"
        ),
        Astrologer(
            id = 4,
            name = "Meera Krishnan",
            specialty = "Finance & Wealth (Muhurat)",
            style = "Plain Modern Language",
            price = 79,
            bio = "Modern financial astrologer specializing in auspicious timings (Muhurats) for business launches, investments, and wealth-building yogas.",
            languages = listOf("Tamil", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "💰"
        ),
        Astrologer(
            id = 5,
            name = "Rajesh Vastu Guru",
            specialty = "Vastu & Property",
            style = "Traditional Vedic",
            price = 199,
            bio = "Guiding real estate purchases, home layouts, and energetic corrections using Vastu Purusha principles to bring health and abundance.",
            languages = listOf("Hindi", "Punjabi", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "🏠"
        ),
        Astrologer(
            id = 6,
            name = "Siddharth Numerology",
            specialty = "Numerology & Destiny",
            style = "Plain Modern Language",
            price = 19,
            bio = "Unveil your Life Path, Destiny, and Soul numbers. Get quick, practical insights on name vibrations and lucky calendar dates.",
            languages = listOf("English", "Hindi"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "🔢"
        ),
        Astrologer(
            id = 7,
            name = "Swami Anand Giri",
            specialty = "Spiritual & Karmic Path",
            style = "Traditional Vedic",
            price = 129,
            bio = "Understand your soul's blueprint, past life debts, and active karmic blockages. Focused on inner peace, meditation guidance, and Moksha path.",
            languages = listOf("Sanskrit", "Hindi", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "🧘"
        ),
        Astrologer(
            id = 8,
            name = "Nisha Deshmukh",
            specialty = "Health & Wellness (Ayur-Astrology)",
            style = "Plain Modern Language",
            price = 59,
            bio = "Integrates Vedic charts with Ayurvedic dosha types. Offers advice on ideal routines, dietary adjustments, and preventative wellness timing.",
            languages = listOf("Marathi", "Hindi", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "🌱"
        ),
        Astrologer(
            id = 9,
            name = "Devika Roy",
            specialty = "Foreign Travel & Settlement",
            style = "Plain Modern Language",
            price = 89,
            bio = "Specializes in Rahu-Ketu travel transits, analyzing overseas immigration prospects, visa approval windows, and global job shifts.",
            languages = listOf("Bengali", "English"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "✈️"
        ),
        Astrologer(
            id = 10,
            name = "Aarav Singhal",
            specialty = "Academic & Exam Success",
            style = "Plain Modern Language",
            price = 39,
            bio = "Empowering students in stream selection, tracking educational focus blocks, and analyzing favorable periods for competitive exams.",
            languages = listOf("English", "Hindi"),
            averageRating = null,
            totalSessions = 0,
            iconSymbol = "🎓"
        )
    )

    // User Profile Flows
    val userProfile: Flow<UserProfile?> = dao.getUserProfileFlow()

    suspend fun getUserProfileDirect(): UserProfile? = dao.getUserProfile()

    suspend fun saveUserProfile(profile: UserProfile) {
        dao.saveUserProfile(profile)
    }

    suspend fun clearUserProfile() {
        dao.clearUserProfile()
    }

    // Report Session Flows
    val allSessions: Flow<List<ReportSession>> = dao.getAllSessionsFlow()

    fun getSessionFlow(sessionId: Int): Flow<ReportSession?> = dao.getSessionFlowById(sessionId)

    suspend fun getSessionDirect(sessionId: Int): ReportSession? = dao.getSessionById(sessionId)

    suspend fun createSession(session: ReportSession): Int {
        return dao.saveSession(session).toInt()
    }

    suspend fun markSessionAsPaid(sessionId: Int) {
        dao.markSessionAsPaid(sessionId)
    }

    suspend fun submitRating(sessionId: Int, rating: Int) {
        dao.updateSessionRating(sessionId, rating)
    }

    /**
     * Retrieves all astrologers with dynamically combined rating/session counts from the database!
     */
    suspend fun getAstrologers(): List<Astrologer> {
        return baseAstrologers.map { astrologer ->
            val ratings = dao.getRatingsForAstrologer(astrologer.id)
            val sessionCount = dao.getSessionCountForAstrologer(astrologer.id)
            
            val avgRating = if (ratings.isEmpty()) {
                null
            } else {
                ratings.average()
            }

            astrologer.copy(
                averageRating = avgRating,
                totalSessions = sessionCount
            )
        }
    }

    /**
     * Triggers report generation with Gemini in a background task
     */
    suspend fun generateReport(sessionId: Int, language: String = "Hinglish"): String {
        val session = dao.getSessionById(sessionId) ?: return "Session not found."
        
        val astrologer = baseAstrologers.find { it.id == session.astrologerId }
            ?: return "Selected astrologer profile not found."

        val partnerDetailsString = if (session.partnerName != null) {
            "Partner Name: ${session.partnerName}, DOB: ${session.partnerDob}, TOB: ${session.partnerTob}, POB: ${session.partnerPob}"
        } else null

        val reportText = GeminiService.generateAstrologyReport(
            userName = session.userName,
            gender = session.gender,
            dob = session.dob,
            tob = session.tob,
            pob = session.pob,
            question = session.question,
            partnerDetails = partnerDetailsString,
            astrologerName = session.astrologerName,
            specialty = session.specialty,
            style = astrologer.style,
            bio = astrologer.bio,
            language = language
        )

        // Save generated report text back to session
        val updatedSession = session.copy(reportText = reportText)
        dao.saveSession(updatedSession)

        return reportText
    }

    /**
     * Submits a follow-up question
     */
    suspend fun generateFollowUp(sessionId: Int, question: String, language: String = "Hinglish"): String {
        val session = dao.getSessionById(sessionId) ?: return "Session not found."
        if (session.reportText == null) return "Consultation report not found."

        val astrologer = baseAstrologers.find { it.id == session.astrologerId }
            ?: return "Selected astrologer profile not found."

        val response = GeminiService.generateFollowUpResponse(
            userName = session.userName,
            dob = session.dob,
            tob = session.tob,
            pob = session.pob,
            originalQuestion = session.question,
            originalReport = session.reportText,
            followUpQuestion = question,
            astrologerName = session.astrologerName,
            specialty = session.specialty,
            style = astrologer.style,
            bio = astrologer.bio,
            language = language
        )

        dao.saveFollowUp(sessionId, question, response)
        return response
    }
}
