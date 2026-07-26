package com.example.ui

import android.app.Application
import android.content.ContentValues
import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.widget.Toast
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

sealed class BillingItem {
    data class SingleReport(val session: ReportSession) : BillingItem()
    data class Subscription(val id: String, val name: String, val price: Int, val period: String, val description: String) : BillingItem()
    data class CreditsPack(val id: String, val name: String, val price: Int, val creditsAmount: Int, val description: String) : BillingItem()
}

data class CreditsPackItem(
    val id: String,
    val name: String,
    val price: Int,
    val creditsAmount: Int,
    val description: String,
    val iconSymbol: String
)

data class SubscriptionTier(
    val id: String,
    val name: String,
    val price: Int,
    val period: String, // "week", "month", "year"
    val description: String,
    val iconSymbol: String,
    val features: List<String>
)

enum class NotificationType {
    DAILY_HOROSCOPE,
    CONSULTATION_INSIGHT,
    REFERRAL,
    GENERAL
}

data class AstroNotification(
    val id: String = java.util.UUID.randomUUID().toString(),
    val title: String,
    val message: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isRead: Boolean = false,
    val type: NotificationType
)

enum class CampaignActionType {
    SUBSCRIBE,
    BUY_CREDITS,
    REFER_FRIEND,
    DISMISS
}

/** A daily-streak milestone and the feature it unlocks. */
data class StreakReward(val days: Int, val id: String, val label: String)

data class MarketingCampaign(
    val id: String,
    val title: String,
    val subtitle: String,
    val description: String,
    val badgeText: String?,
    val actionText: String,
    val iconSymbol: String,
    val actionType: CampaignActionType,
    val actionId: String
)

data class PanchangData(
    val date: String, // e.g. "2026-07-20"
    val tithi: String, // e.g. "Shashthi"
    val nakshatra: String, // e.g. "Chitra"
    val yoga: String, // e.g. "Siddha"
    val karana: String, // e.g. "Kaulava"
    val rahuKaal: String, // e.g. "07:30 AM - 09:00 AM"
    val sunrise: String, // e.g. "05:46 AM"
    val sunset: String, // e.g. "07:12 PM"
    val moonSign: String, // e.g. "Kanya (Virgo)"
    val explanation: String // short explanation of what this tithi represents
)

enum class Screen {
    Onboarding,
    AstrologerList,
    IntakeForm,
    Suspense,
    Paywall,
    ReportView,
    MyReports,
    Profile
}

class AstrologyViewModel(application: Application) : AndroidViewModel(application) {

    companion object {
        val STREAK_REWARDS = listOf(
            StreakReward(3, "streak_3", "Extended daily reading"),
            StreakReward(7, "streak_7", "Full varga chart set (D1-D60)"),
            StreakReward(14, "streak_14", "Five-level dasha depth"),
            StreakReward(30, "streak_30", "Lifetime Pro report export")
        )
    }


    private val database = AppDatabase.getDatabase(application)
    private val repository = AstrologyRepository(database.astrologyDao())

    // UI Navigation State
    private val _currentScreen = MutableStateFlow(Screen.Onboarding)
    val currentScreen: StateFlow<Screen> = _currentScreen.asStateFlow()

    // Screen navigation stack/history for Back handling
    private val screenStack = mutableListOf<Screen>()

    // User Data State
    val userProfile: StateFlow<UserProfile?> = repository.userProfile
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    // Astrologer List State
    private val _astrologers = MutableStateFlow<List<Astrologer>>(emptyList())
    val astrologers: StateFlow<List<Astrologer>> = _astrologers.asStateFlow()

    // History of consultations
    val allSessions: StateFlow<List<ReportSession>> = repository.allSessions
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Active Selection and Consultation Details
    private val _selectedAstrologer = MutableStateFlow<Astrologer?>(null)
    val selectedAstrologer: StateFlow<Astrologer?> = _selectedAstrologer.asStateFlow()

    private val _activeSession = MutableStateFlow<ReportSession?>(null)
    val activeSession: StateFlow<ReportSession?> = _activeSession.asStateFlow()

    // Loading & Suspense States
    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating.asStateFlow()

    private val _suspenseText = MutableStateFlow("Initializing celestial alignment...")
    val suspenseText: StateFlow<String> = _suspenseText.asStateFlow()

    private val _isSubmittingFollowUp = MutableStateFlow(false)
    val isSubmittingFollowUp: StateFlow<Boolean> = _isSubmittingFollowUp.asStateFlow()

    // OTP Verification Simulation State
    private val _isVerifyingOtp = MutableStateFlow(false)
    val isVerifyingOtp: StateFlow<Boolean> = _isVerifyingOtp.asStateFlow()

    private val _otpSent = MutableStateFlow(false)
    val otpSent: StateFlow<Boolean> = _otpSent.asStateFlow()

    // Bottom Navigation Bar State
    private val _selectedTab = MutableStateFlow(0) // 0 = Home, 1 = My Reports, 2 = Profile
    val selectedTab: StateFlow<Int> = _selectedTab.asStateFlow()

    // In-App Marketing Campaigns State
    private val _campaigns = MutableStateFlow(listOf(
        MarketingCampaign(
            id = "campaign_shravan_credits",
            title = "✨ Shravan Month Special",
            subtitle = "Acharya Pack (20% Extra Credits!)",
            description = "Sadhana and planetary transitions this month favor intensive consultations. Get ₹1000 credits for just ₹800 (Save ₹200)!",
            badgeText = "LIMITED TIME OFFER",
            actionText = "Recharge Now",
            iconSymbol = "🔱",
            actionType = CampaignActionType.BUY_CREDITS,
            actionId = "credits_1000"
        ),
        MarketingCampaign(
            id = "campaign_gold_subscription",
            title = "👑 Mahadasha Gold",
            subtitle = "Annual Devotion Tier - Save 60%",
            description = "Get unlimited daily panchang, customized transit forecasts, and prioritized 1-on-1 advisor consultations for the whole year.",
            badgeText = "BEST VALUE",
            actionText = "Subscribe Gold",
            iconSymbol = "🌟",
            actionType = CampaignActionType.SUBSCRIBE,
            actionId = "Mahadasha Gold"
        ),
        MarketingCampaign(
            id = "campaign_double_referral",
            title = "🪙 Double Celestial Rewards",
            subtitle = "Invite Seekers, Earn ₹150 Credits",
            description = "Spread the divine wisdom! Get a flat ₹150 added to your celestial wallet for every friend who activates a report.",
            badgeText = "WEEKEND FLASH PROMO",
            actionText = "Invite Friends",
            iconSymbol = "🤝",
            actionType = CampaignActionType.REFER_FRIEND,
            actionId = ""
        )
    ))
    val campaigns: StateFlow<List<MarketingCampaign>> = _campaigns.asStateFlow()

    fun dismissCampaign(id: String) {
        _campaigns.value = _campaigns.value.filter { it.id != id }
    }

    fun handleCampaignAction(campaign: MarketingCampaign) {
        when (campaign.actionType) {
            CampaignActionType.BUY_CREDITS -> {
                val pack = creditsPacks.find { it.id == campaign.actionId }
                if (pack != null) {
                    selectCreditsPack(pack)
                }
            }
            CampaignActionType.SUBSCRIBE -> {
                val tier = subscriptionTiers.find { it.name == campaign.actionId }
                if (tier != null) {
                    selectSubscription(tier)
                }
            }
            CampaignActionType.REFER_FRIEND -> {
                setTab(2)
            }
            CampaignActionType.DISMISS -> {
                dismissCampaign(campaign.id)
            }
        }
    }

    // Play Billing Bottom Sheet State
    private val _showBillingSheet = MutableStateFlow(false)
    val showBillingSheet: StateFlow<Boolean> = _showBillingSheet.asStateFlow()

    private val _billingSuccessAnim = MutableStateFlow(false)
    val billingSuccessAnim: StateFlow<Boolean> = _billingSuccessAnim.asStateFlow()

    // Google Play Billing Item and Error States
    private val _currentBillingItem = MutableStateFlow<BillingItem?>(null)
    val currentBillingItem: StateFlow<BillingItem?> = _currentBillingItem.asStateFlow()

    private val _billingErrorMsg = MutableStateFlow<String?>(null)
    val billingErrorMsg: StateFlow<String?> = _billingErrorMsg.asStateFlow()

    // Daily Horoscope State
    private val _dailyHoroscope = MutableStateFlow<String?>(null)
    val dailyHoroscope: StateFlow<String?> = _dailyHoroscope.asStateFlow()

    private val _isGeneratingDailyHoroscope = MutableStateFlow(false)
    val isGeneratingDailyHoroscope: StateFlow<Boolean> = _isGeneratingDailyHoroscope.asStateFlow()

    // Dynamic translation support
    private val _translatedReportText = MutableStateFlow<String?>(null)
    val translatedReportText: StateFlow<String?> = _translatedReportText.asStateFlow()

    private val _isTranslatingReport = MutableStateFlow(false)
    val isTranslatingReport: StateFlow<Boolean> = _isTranslatingReport.asStateFlow()

    private val _translatedDailyHoroscope = MutableStateFlow<String?>(null)
    val translatedDailyHoroscope: StateFlow<String?> = _translatedDailyHoroscope.asStateFlow()

    private val _isTranslatingHoroscope = MutableStateFlow(false)
    val isTranslatingHoroscope: StateFlow<Boolean> = _isTranslatingHoroscope.asStateFlow()

    // Vedic Calendar (Panchang) State
    private val _selectedPanchangDate = MutableStateFlow(
        java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
    )
    val selectedPanchangDate: StateFlow<String> = _selectedPanchangDate.asStateFlow()

    private val _currentPanchang = MutableStateFlow<PanchangData?>(null)
    val currentPanchang: StateFlow<PanchangData?> = _currentPanchang.asStateFlow()

    fun translateReport(targetLanguage: String) {
        val text = _activeSession.value?.reportText ?: return
        viewModelScope.launch {
            _isTranslatingReport.value = true
            try {
                _translatedReportText.value = GeminiService.translateText(text, targetLanguage)
            } catch (e: Exception) {
                _translatedReportText.value = "Translation error: ${e.localizedMessage ?: e.message}"
            } finally {
                _isTranslatingReport.value = false
            }
        }
    }

    fun clearReportTranslation() {
        _translatedReportText.value = null
    }

    fun translateDailyHoroscope(targetLanguage: String) {
        val text = _dailyHoroscope.value ?: return
        viewModelScope.launch {
            _isTranslatingHoroscope.value = true
            try {
                _translatedDailyHoroscope.value = GeminiService.translateText(text, targetLanguage)
            } catch (e: Exception) {
                _translatedDailyHoroscope.value = "Translation error: ${e.localizedMessage ?: e.message}"
            } finally {
                _isTranslatingHoroscope.value = false
            }
        }
    }

    fun clearHoroscopeTranslation() {
        _translatedDailyHoroscope.value = null
    }

    fun updateLanguage(language: String) {
        viewModelScope.launch {
            val currentProfile = repository.getUserProfileDirect()
            if (currentProfile != null) {
                val updatedProfile = currentProfile.copy(preferredLanguage = language)
                repository.saveUserProfile(updatedProfile)
                clearReportTranslation()
                clearHoroscopeTranslation()
                // Regenerate horoscope if it exists
                if (_dailyHoroscope.value != null && !_dailyHoroscope.value!!.contains("Please first request")) {
                    fetchDailyHoroscope()
                }
            }
        }
    }

    fun updatePanchangDate(dateStr: String) {
        _selectedPanchangDate.value = dateStr
        val lang = userProfile.value?.preferredLanguage ?: "Hinglish"
        _currentPanchang.value = calculatePanchang(dateStr, lang)
    }

    // ------------------------------------------------------------------
    // Daily engagement streak
    //
    // Mirrors the reward ladder on the web landing page so both surfaces
    // unlock the same features at the same milestones.
    // ------------------------------------------------------------------

    private val _streakToast = MutableStateFlow<String?>(null)
    val streakToast: StateFlow<String?> = _streakToast.asStateFlow()

    fun clearStreakToast() { _streakToast.value = null }

    /** Register today's visit and unlock any milestone reached. */
    fun touchDailyStreak() {
        viewModelScope.launch {
            val profile = repository.getUserProfileDirect() ?: return@launch
            val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val today = fmt.format(java.util.Date())
            if (profile.streakLastDay == today) return@launch

            val yesterday = fmt.format(java.util.Date(System.currentTimeMillis() - 86_400_000L))
            val newCount = if (profile.streakLastDay == yesterday) profile.streakCount + 1 else 1
            val newBest = maxOf(profile.streakBest, newCount)

            val milestone = STREAK_REWARDS.firstOrNull { it.days == newCount }
            val unlocked = if (milestone != null && !profile.unlockedRewards.contains(milestone.id)) {
                listOf(profile.unlockedRewards, milestone.id).filter { it.isNotBlank() }.joinToString(",")
            } else profile.unlockedRewards

            repository.saveUserProfile(
                profile.copy(
                    streakCount = newCount,
                    streakBest = newBest,
                    streakLastDay = today,
                    unlockedRewards = unlocked
                )
            )

            if (milestone != null) {
                _streakToast.value = "$newCount-day streak! ${milestone.label} unlocked."
                addNotification(
                    title = "$newCount-Day Streak \uD83D\uDD25",
                    message = "${milestone.label} is now unlocked in your account.",
                    type = NotificationType.GENERAL
                )
            }
        }
    }

    fun hasReward(profile: UserProfile?, id: String): Boolean =
        profile?.unlockedRewards?.split(",")?.contains(id) == true

    /** Deterministic shareable referral code, identical in shape to the web app. */
    fun referralCodeFor(profile: UserProfile?): String {
        val raw = (profile?.name ?: "").uppercase(java.util.Locale.US).replace("[^A-Z0-9]".toRegex(), "")
        val base = if (raw.isBlank()) "SEEKER" else raw.take(8)
        val seed = (profile?.phone ?: "0000")
        var h = 0
        for (ch in seed) h = (h * 31 + ch.code) and 0x7fffffff
        return "ADI-$base-${1000 + (h % 9000)}"
    }

    fun triggerDailyPanchangReminder() {
        val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
        val lang = userProfile.value?.preferredLanguage ?: "Hinglish"
        val panchang = calculatePanchang(todayStr, lang)

        val title = when (lang.lowercase()) {
            "hinglish" -> "Aaj Ka Panchang 🌅"
            "hindi", "हिन्दी" -> "आज का पंचांग 🌅"
            else -> "Today's Vedic Calendar 🌅"
        }

        val message = when (lang.lowercase()) {
            "hinglish" -> "Aaj tithi ${panchang.tithi} hai! ${panchang.explanation.replace("**", "")}"
            "hindi", "हिन्दी" -> "आज तिथि ${panchang.tithi} है! ${panchang.explanation.replace("**", "")}"
            else -> "Today is ${panchang.tithi} Tithi! ${panchang.explanation.replace("**", "")}"
        }

        addNotification(
            title = title,
            message = message,
            type = NotificationType.DAILY_HOROSCOPE
        )
    }

    fun calculatePanchang(dateStr: String, language: String): PanchangData {
        val hash = dateStr.hashCode()
        val absHash = kotlin.math.abs(hash)

        val tithis = listOf(
            "Pratipada", "Dwitiya", "Tritiya", "Chaturthi (Ganesh Chaturthi)", "Panchami",
            "Shashthi", "Saptami", "Ashtami", "Navami (Ram Navami)", "Dashami",
            "Ekadashi (Shubh Vrat)", "Dwadashi", "Trayodashi (Pradosh)", "Chaturdashi",
            "Purnima (Full Moon / Sacred Day)", "Amavasya (New Moon / Pitru Day)"
        )
        val nakshatras = listOf(
            "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
            "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
            "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purvashadha",
            "Uttarashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
            "Uttara Bhadrapada", "Revati"
        )
        val yogas = listOf(
            "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
            "Dhriti", "Shula", "Ganda", "Vridhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
            "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
            "Shukla", "Brahma", "Indra", "Vaidhriti"
        )
        val karanas = listOf(
            "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti", "Shakuni",
            "Chatushpada", "Naga", "Kinstughna"
        )
        val moonSigns = listOf(
            "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
            "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
            "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
        )

        val tithi = tithis[absHash % tithis.size]
        val nakshatra = nakshatras[(absHash + 3) % nakshatras.size]
        val yoga = yogas[(absHash + 7) % yogas.size]
        val karana = karanas[(absHash + 11) % karanas.size]
        val moonSign = moonSigns[(absHash + 13) % moonSigns.size]

        val sunriseMin = 40 + (absHash % 21)
        val sunsetMin = 30 + (absHash % 45)
        val sunrise = "05:$sunriseMin AM"
        val sunset = "06:$sunsetMin PM"

        val rahuKaalWindows = listOf(
            "07:30 AM - 09:00 AM", "09:00 AM - 10:30 AM", "10:30 AM - 12:00 PM",
            "12:00 PM - 01:30 PM", "01:30 PM - 03:00 PM", "03:00 PM - 04:30 PM",
            "04:30 PM - 06:00 PM"
        )
        val rahuKaal = rahuKaalWindows[absHash % rahuKaalWindows.size]

        val explanation = when (language.lowercase()) {
            "hinglish" -> {
                buildString {
                    append("Aaj ki tithi hai **$tithi** aur Nakshatra **$nakshatra** hai. ")
                    if (tithi.contains("Ekadashi")) {
                        append("Ekadashi vrat aaj rakhne se mind clear hota hai aur health improve hoti hai. Meditation ke liye bohot hi shubh din hai.")
                    } else if (tithi.contains("Purnima")) {
                        append("Purnima ke din moon energy peak par hoti hai. Spiritual acts, charity, aur family connections ke liye yeh din bohot hi auspicious hai.")
                    } else if (tithi.contains("Amavasya")) {
                        append("Amavasya Pitru Tarpan aur meditation ke liye best hai. Aaj naye business ventures start karne se bachein.")
                    } else if (tithi.contains("Chaturthi")) {
                        append("Chaturthi Bhagwan Ganesha ka din hai. Naye kaam start karne ke liye sabhi obstacles dur honge. Modak prasad chadhaein.")
                    } else {
                        append("Aaj ka din $tithi tithi ke sath stability aur growth ke liye shubh hai. Rahu Kaal ($rahuKaal) ke dauran important decisions lene se bachein.")
                    }
                    append(" Moon placement aaj **$moonSign** mein hai, jo dynamic changes ko show karta hai.")
                }
            }
            "hindi", "हिन्दी" -> {
                buildString {
                    append("आज की तिथि **$tithi** है और नक्षत्र **$nakshatra** है। ")
                    if (tithi.contains("Ekadashi")) {
                        append("आज एकादशी व्रत रखने से मानसिक शांति मिलती है और स्वास्थ्य में सुधार होता है। ध्यान और जप के लिए यह अत्यंत उत्तम दिन है।")
                    } else if (tithi.contains("Purnima")) {
                        append("पूर्णिमा के दिन चंद्र ऊर्जा अपने चरम पर होती है। आध्यात्मिक कार्यों, दान और पारिवारिक मेल-जोल के लिए यह दिन अत्यंत शुभ है।")
                    } else if (tithi.contains("Amavasya")) {
                        append("अमावस्या पितृ पूजन और ध्यान के लिए सर्वोत्तम है। आज नए व्यावसायिक कार्य शुरू करने से बचें।")
                    } else if (tithi.contains("Chaturthi")) {
                        append("चतुर्थी भगवान श्री गणेश का दिन है। विघ्न-बाधाओं को दूर करने के लिए भगवान गणेश की पूजा करें।")
                    } else {
                        append("आज का दिन $tithi तिथि के प्रभाव से स्थिरता और प्रगति के लिए अनुकूल है। राहु काल ($rahuKaal) के समय महत्वपूर्ण निर्णयों से बचें।")
                    }
                    append(" चंद्रमा आज **$moonSign** राशि में संचरण कर रहे हैं।")
                }
            }
            else -> {
                buildString {
                    append("Today's auspicious tithi is **$tithi** under the influence of **$nakshatra** Nakshatra. ")
                    if (tithi.contains("Ekadashi")) {
                        append("Observing Ekadashi fast today brings immense mental clarity and physiological rejuvenation. An highly auspicious day for deep meditation.")
                    } else if (tithi.contains("Purnima")) {
                        append("The lunar energy is at its absolute peak on Purnima. Highly favorable for spiritual self-reflection, charity, and celebrating family bonds.")
                    } else if (tithi.contains("Amavasya")) {
                        append("Amavasya is powerful for ancestral introspection and silent meditation. Avoid initiating major material ventures today.")
                    } else if (tithi.contains("Chaturthi")) {
                        append("Chaturthi is dedicated to Lord Ganesha, the remover of obstacles. Pray and invoke His blessing for success in new assignments.")
                    } else {
                        append("This day under the $tithi lunar phase promotes steady foundation, wellness, and self-care. It is recommended to avoid starting new critical ventures during Rahu Kaal ($rahuKaal).")
                    }
                    append(" The Moon is currently placed in **$moonSign**.")
                }
            }
        }

        return PanchangData(
            date = dateStr,
            tithi = tithi,
            nakshatra = nakshatra,
            yoga = yoga,
            karana = karana,
            rahuKaal = rahuKaal,
            sunrise = sunrise,
            sunset = sunset,
            moonSign = moonSign,
            explanation = explanation
        )
    }

    // Referral system notifications
    private val _referralNotification = MutableStateFlow<String?>(null)
    val referralNotification: StateFlow<String?> = _referralNotification.asStateFlow()

    fun clearReferralNotification() {
        _referralNotification.value = null
    }

    // Notification System State
    private val _notifications = MutableStateFlow<List<AstroNotification>>(
        listOf(
            AstroNotification(
                title = "Welcome to Adi Jyotish ✨",
                message = "The cosmic alignment of your birth can now be read by our modern AI spiritual gurus.",
                type = NotificationType.GENERAL
            ),
            AstroNotification(
                title = "Daily Horoscopes Active ☀️",
                message = "Provide accurate Date & Time of Birth to enable highly precise daily transit calculations.",
                type = NotificationType.GENERAL
            )
        )
    )
    val notifications: StateFlow<List<AstroNotification>> = _notifications.asStateFlow()

    fun addNotification(title: String, message: String, type: NotificationType) {
        val newNotification = AstroNotification(title = title, message = message, type = type)
        _notifications.value = listOf(newNotification) + _notifications.value
    }

    fun markAsRead(id: String) {
        _notifications.value = _notifications.value.map {
            if (it.id == id) it.copy(isRead = true) else it
        }
    }

    fun markAllAsRead() {
        _notifications.value = _notifications.value.map { it.copy(isRead = true) }
    }

    fun dismissNotification(id: String) {
        _notifications.value = _notifications.value.filter { it.id != id }
    }

    fun clearAllNotifications() {
        _notifications.value = emptyList()
    }

    fun simulateDailyHoroscopeNotification() {
        addNotification(
            title = "Daily Horoscope Ready 🪐",
            message = "A new daily transit reading for today has been charted. Tap to check your celestial dashboard.",
            type = NotificationType.DAILY_HOROSCOPE
        )
    }

    fun simulateConsultationNotification() {
        addNotification(
            title = "Consultation Insight Ready 🔮",
            message = "Your astrologer advisor has formulated a new karmic insight. Click My Reports to view.",
            type = NotificationType.CONSULTATION_INSIGHT
        )
    }

    // FAQ States
    private val _faqAnswer = MutableStateFlow<String?>(null)
    val faqAnswer: StateFlow<String?> = _faqAnswer.asStateFlow()

    private val _isFaqLoading = MutableStateFlow(false)
    val isFaqLoading: StateFlow<Boolean> = _isFaqLoading.asStateFlow()

    private val _faqError = MutableStateFlow<String?>(null)
    val faqError: StateFlow<String?> = _faqError.asStateFlow()

    fun askAstroFAQ(question: String) {
        if (question.isBlank()) return
        viewModelScope.launch {
            _isFaqLoading.value = true
            _faqError.value = null
            _faqAnswer.value = null
            val profile = repository.getUserProfileDirect()
            val name = profile?.name ?: "Seeker"
            val lang = profile?.preferredLanguage ?: "Hinglish"
            try {
                val answer = GeminiService.answerFAQ(question, name, lang)
                _faqAnswer.value = answer
            } catch (e: Exception) {
                _faqError.value = "Error: ${e.localizedMessage ?: e.message}"
            } finally {
                _isFaqLoading.value = false
            }
        }
    }

    fun clearFAQ() {
        _faqAnswer.value = null
        _faqError.value = null
        _isFaqLoading.value = false
    }

    // Master list of Premium Consultation subscription tiers
    val subscriptionTiers = listOf(
        SubscriptionTier(
            id = "SubTier_Bronze",
            name = "Nakshatra Bronze",
            price = 199,
            period = "week",
            description = "Ideal for casual seekers. Free consultations with Pt. Vasudev Shastri, Aacharya Rohit Joshi and Siddharth Numerology. 10% discount on others.",
            iconSymbol = "🥉",
            features = listOf(
                "Free general, career & numerology guidance",
                "10% discount on all other elite astrologers",
                "1 included follow-up question per consultation",
                "Fully simulated Play Billing sandbox"
            )
        ),
        SubscriptionTier(
            id = "SubTier_Silver",
            name = "Rashifal Silver",
            price = 499,
            period = "month",
            description = "Best value for continuous spiritual growth. Free consultations with Pt. Vasudev Shastri, Aacharya Rohit Joshi, Meera Krishnan, Siddharth Numerology and Swami Anand Giri.",
            iconSymbol = "🥈",
            features = listOf(
                "Free general, career, financial, numerology & karmic guidance",
                "25% discount on remaining premium guides",
                "1 included follow-up question per consultation",
                "Direct PDF download capabilities"
            )
        ),
        SubscriptionTier(
            id = "SubTier_Gold",
            name = "Mahadasha Gold",
            price = 1999,
            period = "year",
            description = "The ultimate celestial alignment. Instant, completely free consultations across ALL 10 AI Astrologers.",
            iconSymbol = "🥇",
            features = listOf(
                "100% Free consultations for all 10 specialized guides",
                "Priority fast report generation queue",
                "Unlimited consultations while subscribed",
                "Interactive gold-styled dashboard badging"
            )
        )
    )

    // Master list of Consultation Credits Packs
    val creditsPacks = listOf(
        CreditsPackItem(
            id = "credits_100",
            name = "Sadhaka Pack",
            price = 100,
            creditsAmount = 100,
            description = "Get ₹100 consultation credits to ask standard questions.",
            iconSymbol = "🕉️"
        ),
        CreditsPackItem(
            id = "credits_500",
            name = "Purohit Pack",
            price = 450,
            creditsAmount = 500,
            description = "Get ₹500 consultation credits (Includes ₹50 free bonus credits!).",
            iconSymbol = "🔱"
        ),
        CreditsPackItem(
            id = "credits_1000",
            name = "Acharya Pack",
            price = 800,
            creditsAmount = 1000,
            description = "Get ₹1000 consultation credits (Includes ₹200 mega bonus credits!).",
            iconSymbol = "👑"
        )
    )

    fun selectCreditsPack(pack: CreditsPackItem) {
        _currentBillingItem.value = BillingItem.CreditsPack(
            id = pack.id,
            name = pack.name,
            price = pack.price,
            creditsAmount = pack.creditsAmount,
            description = pack.description
        )
        _billingErrorMsg.value = null
        _showBillingSheet.value = true
    }

    fun getConsultationPrice(astrologerId: Int, basePrice: Int, tier: String): Int {
        return when (tier) {
            "Mahadasha Gold" -> 0
            "Rashifal Silver" -> {
                // Free: Shastri (1), Joshi (3), Meera (4), Siddharth (6), Swami (7)
                if (astrologerId in listOf(1, 3, 4, 6, 7)) 0 else (basePrice * 0.75).toInt()
            }
            "Nakshatra Bronze" -> {
                // Free: Shastri (1), Joshi (3), Siddharth (6)
                if (astrologerId in listOf(1, 3, 6)) 0 else (basePrice * 0.90).toInt()
            }
            else -> basePrice
        }
    }

    init {
        viewModelScope.launch {
            // Check if user is already logged in
            val profile = repository.getUserProfileDirect()
            if (profile != null && profile.isLoggedIn) {
                _currentScreen.value = Screen.AstrologerList
            } else {
                _currentScreen.value = Screen.Onboarding
            }
            refreshAstrologers()

            // Initialize Vedic Calendar
            val todayStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
            val lang = profile?.preferredLanguage ?: "Hinglish"
            updatePanchangDate(todayStr)

            // Trigger today's Panchang reminder notification
            if (profile != null && profile.isLoggedIn) {
                triggerDailyPanchangReminder()
            }
        }
    }

    fun navigateTo(screen: Screen) {
        if (_currentScreen.value != screen) {
            screenStack.add(_currentScreen.value)
            _currentScreen.value = screen
        }
    }

    fun navigateBack() {
        if (screenStack.isNotEmpty()) {
            _currentScreen.value = screenStack.removeAt(screenStack.size - 1)
        } else {
            // If empty, fall back logically
            when (_currentScreen.value) {
                Screen.IntakeForm -> _currentScreen.value = Screen.AstrologerList
                Screen.ReportView -> _currentScreen.value = Screen.AstrologerList
                Screen.Paywall -> _currentScreen.value = Screen.IntakeForm
                Screen.Onboarding -> {} // Can't go back
                else -> _currentScreen.value = Screen.AstrologerList
            }
        }
    }

    fun setTab(index: Int) {
        _selectedTab.value = index
        when (index) {
            0 -> _currentScreen.value = Screen.AstrologerList
            1 -> _currentScreen.value = Screen.MyReports
            2 -> _currentScreen.value = Screen.Profile
        }
        // Clear screen stack upon main navigation to prevent weird loops
        screenStack.clear()
    }

    fun selectAstrologer(astrologer: Astrologer) {
        _selectedAstrologer.value = astrologer
        navigateTo(Screen.IntakeForm)
    }

    fun refreshAstrologers() {
        viewModelScope.launch {
            _astrologers.value = repository.getAstrologers()
        }
    }

    // Onboarding Actions
    fun triggerOtpSend(name: String, phone: String) {
        viewModelScope.launch {
            _isVerifyingOtp.value = true
            delay(1500) // Simulate Firebase OTP network trigger
            _otpSent.value = true
            _isVerifyingOtp.value = false
        }
    }

    fun verifyOtpAndLogin(name: String, phone: String, code: String, consented: Boolean, language: String = "Hinglish") {
        viewModelScope.launch {
            _isVerifyingOtp.value = true
            delay(1500) // Simulate Firebase validation
            val profile = UserProfile(name = name, phone = phone, consented = consented, isLoggedIn = true, preferredLanguage = language)
            repository.saveUserProfile(profile)
            _isVerifyingOtp.value = false
            _currentScreen.value = Screen.AstrologerList
            refreshAstrologers()
            
            // Trigger today's Panchang reminder notification
            triggerDailyPanchangReminder()
        }
    }

    fun logOut() {
        viewModelScope.launch {
            repository.clearUserProfile()
            _otpSent.value = false
            _selectedTab.value = 0
            _currentScreen.value = Screen.Onboarding
        }
    }

    // Intake Form Submission
    fun submitIntakeForm(
        gender: String,
        dob: String,
        tob: String,
        pob: String,
        question: String,
        partnerName: String? = null,
        partnerDob: String? = null,
        partnerTob: String? = null,
        partnerPob: String? = null
    ) {
        val astrologer = _selectedAstrologer.value ?: return
        viewModelScope.launch {
            val user = repository.getUserProfileDirect() ?: return@launch
            val finalPrice = getConsultationPrice(astrologer.id, astrologer.price, user.subscriptionTier)
            
            val newSession = ReportSession(
                userName = user.name,
                gender = gender,
                dob = dob,
                tob = tob,
                pob = pob,
                question = question,
                partnerName = partnerName,
                partnerDob = partnerDob,
                partnerTob = partnerTob,
                partnerPob = partnerPob,
                astrologerId = astrologer.id,
                astrologerName = astrologer.name,
                specialty = astrologer.specialty,
                price = finalPrice
            )

            val sessionId = repository.createSession(newSession)
            
            // If the user's active premium subscription tier gives this for free, mark as paid immediately!
            if (finalPrice == 0) {
                repository.markSessionAsPaid(sessionId)
            }

            val createdSession = repository.getSessionDirect(sessionId)
            _activeSession.value = createdSession

            // Transition to suspense/loading screen
            navigateTo(Screen.Suspense)
            generateAstrologyReportInBackground(sessionId)
        }
    }

    // Suspense & Gemini Report Generation
    private fun generateAstrologyReportInBackground(sessionId: Int) {
        viewModelScope.launch {
            _isGenerating.value = true
            
            // Launch coroutine to cycle astrological term descriptions (Suspense loader)
            val loadingJob = launch {
                val vedicTerms = listOf(
                    "Calibrating Ascendant (Lagna) degrees...",
                    "Locating rashi and planetary houses...",
                    "Analyzing Moon placement & nakshatra rulers...",
                    "Running Guna Milan charts...",
                    "Consulting Saturn transit cycles...",
                    "Synthesizing Mahadasha & Antardasha timelines...",
                    "Verifying Rahu & Ketu shadows...",
                    "Balancing Vastu energies & cardinal elements...",
                    "Calculating numerological destiny number...",
                    "Formulating planetary wellness recommendations...",
                    "Polishing personalized Vedic insights..."
                )
                var index = 0
                while (_isGenerating.value) {
                    _suspenseText.value = vedicTerms[index % vedicTerms.size]
                    index++
                    delay(3000) // Cycle terms every 3 seconds to build suspense
                }
            }

            // Real background Gemini API call
            val preferredLanguage = userProfile.value?.preferredLanguage ?: "Hinglish"
            val reportText = repository.generateReport(sessionId, preferredLanguage)
            
            // To guarantee the suspense loader animation feels complete, we add a minimal delay
            delay(1500)

            _isGenerating.value = false
            loadingJob.cancel()

            val updatedSession = repository.getSessionDirect(sessionId)
            _activeSession.value = updatedSession

            if (updatedSession != null) {
                addNotification(
                    title = "New Consultation Insight Generated 🔮",
                    message = "Your sacred report for ${updatedSession.specialty} by Guru ${updatedSession.astrologerName} has been fully mapped and crafted.",
                    type = NotificationType.CONSULTATION_INSIGHT
                )
            }

            // If session is already paid (e.g. under subscription), navigate to ReportView directly, else to Paywall
            if (updatedSession?.isPaid == true) {
                navigateTo(Screen.ReportView)
            } else {
                navigateTo(Screen.Paywall)
            }
        }
    }

    /**
     * Generates a personalized daily horoscope based on the user's previously submitted birth data.
     */
    fun fetchDailyHoroscope() {
        val user = userProfile.value ?: return
        val sessions = allSessions.value
        val latestSession = sessions.firstOrNull { it.dob.isNotBlank() && it.tob.isNotBlank() && it.pob.isNotBlank() }

        if (latestSession == null) {
            _dailyHoroscope.value = "To reveal your daily alignment, please first request and complete a consult report with any of our esteemed astrologers so we can map your natal planetary positions."
            return
        }

        viewModelScope.launch {
            _isGeneratingDailyHoroscope.value = true
            try {
                val preferredLanguage = user.preferredLanguage
                val response = GeminiService.generateDailyHoroscope(
                    userName = user.name,
                    gender = latestSession.gender,
                    dob = latestSession.dob,
                    tob = latestSession.tob,
                    pob = latestSession.pob,
                    language = preferredLanguage
                )
                _dailyHoroscope.value = response
                addNotification(
                    title = "Daily Horoscope Updated 🪐",
                    message = "Warm greetings, ${user.name}! Your customized transit Rashifal has been refreshed and is ready to view.",
                    type = NotificationType.DAILY_HOROSCOPE
                )
            } catch (e: Exception) {
                _dailyHoroscope.value = "The stars are obscured by clouds: ${e.localizedMessage ?: e.message}"
            } finally {
                _isGeneratingDailyHoroscope.value = false
            }
        }
    }

    /**
     * Simulates a friend downloading the app and completing their first paid check.
     * This credits the user's wallet with 50% of the plan price and fires a notification.
     * Restricted to a one-time reward.
     */
    fun simulateReferralInstallAndPurchase(planName: String = "Mahadasha Gold", planPrice: Int = 1999) {
        viewModelScope.launch {
            val current = repository.getUserProfileDirect() ?: return@launch
            val rawName = current.name.uppercase().replace("[^A-Z0-9]".toRegex(), "")
            val cleanedName = if (rawName.isBlank()) "SEEKER" else rawName
            val referralCode = "ADI-$cleanedName"
            
            if (current.referralClaimed) {
                _referralNotification.value = "Referral Bonus is a ONE-TIME reward. You have already claimed your 50% bonus once! Use the reset button below to test again."
                return@launch
            }
            
            val bonus = (planPrice * 0.5).toInt()
            val updated = current.copy(
                walletBalance = current.walletBalance + bonus,
                referralClaimed = true
            )
            repository.saveUserProfile(updated)
            _referralNotification.value = "Kalyan Ho! Your friend activated '$planName' (₹$planPrice) using your code '$referralCode'. You have successfully received your one-time 50% bonus of ₹$bonus in your Referral Wallet!"
            addNotification(
                title = "Referral Reward Received 🪙",
                message = "₹$bonus (50% of the $planName activated by your friend) has been added to your celestial wallet.",
                type = NotificationType.REFERRAL
            )
        }
    }

    /**
     * Resets the referral claim status for testing purposes.
     */
    fun resetReferralStatus() {
        viewModelScope.launch {
            val current = repository.getUserProfileDirect() ?: return@launch
            val updated = current.copy(referralClaimed = false)
            repository.saveUserProfile(updated)
            _referralNotification.value = "Referral status reset! You can now test the one-time 50% bonus flow again."
        }
    }

    /**
     * Completes report purchase using wallet money instead of Google Play Billing.
     */
    fun completeWalletPurchase() {
        val billingItem = _currentBillingItem.value as? BillingItem.SingleReport ?: return
        viewModelScope.launch {
            val current = repository.getUserProfileDirect() ?: return@launch
            val price = billingItem.session.price
            if (current.walletBalance >= price) {
                _billingSuccessAnim.value = true
                delay(1500) // Aesthetic delay for processing
                
                val updatedProfile = current.copy(walletBalance = current.walletBalance - price)
                repository.saveUserProfile(updatedProfile)
                
                repository.markSessionAsPaid(billingItem.session.id)
                _activeSession.value = repository.getSessionDirect(billingItem.session.id)
                
                _showBillingSheet.value = false
                _billingSuccessAnim.value = false
                _currentBillingItem.value = null
                
                refreshAstrologers()
                navigateTo(Screen.ReportView)
            } else {
                _billingErrorMsg.value = "Insufficient wallet balance (₹${current.walletBalance}/₹$price). Please share your horoscope or invite friends to earn credits!"
            }
        }
    }

    // Google Play Billing Actions
    fun triggerPlayBilling() {
        val session = _activeSession.value
        if (session != null) {
            selectSingleReport(session)
        } else {
            _billingErrorMsg.value = null
            _showBillingSheet.value = true
        }
    }

    fun selectSingleReport(session: ReportSession) {
        _currentBillingItem.value = BillingItem.SingleReport(session)
        _billingErrorMsg.value = null
        _showBillingSheet.value = true
    }

    fun selectSubscription(tier: SubscriptionTier) {
        _currentBillingItem.value = BillingItem.Subscription(
            id = tier.id,
            name = tier.name,
            price = tier.price,
            period = tier.period,
            description = tier.description
        )
        _billingErrorMsg.value = null
        _showBillingSheet.value = true
    }

    fun dismissPlayBilling() {
        _showBillingSheet.value = false
        _currentBillingItem.value = null
        _billingErrorMsg.value = null
    }

    fun cancelSubscription() {
        viewModelScope.launch {
            val currentProfile = repository.getUserProfileDirect()
            if (currentProfile != null) {
                val updatedProfile = currentProfile.copy(
                    subscriptionTier = "Free",
                    subscriptionExpiry = 0L
                )
                repository.saveUserProfile(updatedProfile)
                refreshAstrologers()
            }
        }
    }

    fun completePurchaseSuccess() {
        val billingItem = _currentBillingItem.value ?: return
        viewModelScope.launch {
            _billingSuccessAnim.value = true
            delay(2000) // Beautiful mock processing
            
            when (billingItem) {
                is BillingItem.SingleReport -> {
                    repository.markSessionAsPaid(billingItem.session.id)
                    _activeSession.value = repository.getSessionDirect(billingItem.session.id)
                    _showBillingSheet.value = false
                    _billingSuccessAnim.value = false
                    _currentBillingItem.value = null
                    
                    // Refresh ratings/sessions
                    refreshAstrologers()
                    
                    // Open full report
                    navigateTo(Screen.ReportView)
                }
                is BillingItem.Subscription -> {
                    val currentProfile = repository.getUserProfileDirect()
                    if (currentProfile != null) {
                        val durationMs = when (billingItem.period) {
                            "week" -> 7L * 24 * 60 * 60 * 1000
                            "month" -> 30L * 24 * 60 * 60 * 1000
                            "year" -> 365L * 24 * 60 * 60 * 1000
                            else -> 30L * 24 * 60 * 60 * 1000
                        }
                        val expiryTime = System.currentTimeMillis() + durationMs
                        val updatedProfile = currentProfile.copy(
                            subscriptionTier = billingItem.name,
                            subscriptionExpiry = expiryTime
                        )
                        repository.saveUserProfile(updatedProfile)
                    }
                    _showBillingSheet.value = false
                    _billingSuccessAnim.value = false
                    _currentBillingItem.value = null
                    
                    // If we have an active session, check if this new subscription unlocks it instantly!
                    val session = _activeSession.value
                    if (session != null && !session.isPaid) {
                        val currentProfile = repository.getUserProfileDirect()
                        val currentTier = currentProfile?.subscriptionTier ?: "Free"
                        val price = getConsultationPrice(session.astrologerId, session.price, currentTier)
                        if (price == 0) {
                            repository.markSessionAsPaid(session.id)
                            _activeSession.value = repository.getSessionDirect(session.id)
                            refreshAstrologers()
                            navigateTo(Screen.ReportView)
                        } else {
                            // If not completely free, refresh paywall price
                            val updatedSession = session.copy(price = price)
                            _activeSession.value = updatedSession
                        }
                    } else {
                        refreshAstrologers()
                    }
                }
                is BillingItem.CreditsPack -> {
                    val currentProfile = repository.getUserProfileDirect()
                    if (currentProfile != null) {
                        val updatedProfile = currentProfile.copy(
                            walletBalance = currentProfile.walletBalance + billingItem.creditsAmount
                        )
                        repository.saveUserProfile(updatedProfile)
                    }
                    _showBillingSheet.value = false
                    _billingSuccessAnim.value = false
                    _currentBillingItem.value = null
                    
                    addNotification(
                        title = "Wallet Recharged 🪙",
                        message = "₹${billingItem.creditsAmount} consultation credits have been added to your celestial wallet.",
                        type = NotificationType.GENERAL
                    )
                }
            }
        }
    }

    fun completePurchaseFailure(errorMsg: String) {
        _billingErrorMsg.value = errorMsg
    }

    // Follow-up Q&A
    fun submitFollowUpQuestion(question: String) {
        val session = _activeSession.value ?: return
        if (question.isBlank()) return

        viewModelScope.launch {
            _isSubmittingFollowUp.value = true
            val preferredLanguage = userProfile.value?.preferredLanguage ?: "Hinglish"
            val response = repository.generateFollowUp(session.id, question, preferredLanguage)
            _activeSession.value = repository.getSessionDirect(session.id)
            _isSubmittingFollowUp.value = false
        }
    }

    // Rate Session
    fun rateAstrologerSession(rating: Int) {
        val session = _activeSession.value ?: return
        viewModelScope.launch {
            repository.submitRating(session.id, rating)
            _activeSession.value = repository.getSessionDirect(session.id)
            refreshAstrologers() // Recalculate average rating for lists
        }
    }

    // History Re-open
    fun viewHistorySession(session: ReportSession) {
        _activeSession.value = session
        val astrologer = _astrologers.value.find { it.id == session.astrologerId }
        _selectedAstrologer.value = astrologer

        if (session.isPaid) {
            navigateTo(Screen.ReportView)
        } else {
            navigateTo(Screen.Paywall)
        }
    }

    // PDF EXPORT / DOWNLOAD FUNCTIONALITY (using native android.graphics.pdf.PdfDocument)
    fun downloadReportAsPdf(context: Context) {
        val session = _activeSession.value ?: return
        val reportContent = session.reportText ?: return

        viewModelScope.launch(Dispatchers.IO) {
            try {
                val pdfDocument = PdfDocument()
                val paint = Paint()
                val textPaint = Paint().apply {
                    color = Color.BLACK
                    textSize = 12f
                    isAntiAlias = true
                }
                val titlePaint = Paint().apply {
                    color = Color.rgb(101, 31, 255) // Primary Purple style
                    textSize = 18f
                    isFakeBoldText = true
                    isAntiAlias = true
                }
                val subtitlePaint = Paint().apply {
                    color = Color.rgb(218, 165, 32) // Golden style
                    textSize = 14f
                    isFakeBoldText = true
                    isAntiAlias = true
                }

                // Layout parameters
                val pageWidth = 595 // A4 width in postscript points (72 points/inch)
                val pageHeight = 842 // A4 height
                val margin = 54 // 0.75 inch margin
                val usableWidth = pageWidth - (margin * 2)
                
                // Helper to split text into lines that fit the width
                fun splitTextIntoLines(text: String, width: Float): List<String> {
                    val words = text.split(" ")
                    val lines = mutableListOf<String>()
                    var currentLine = StringBuilder()

                    for (word in words) {
                        val testLine = if (currentLine.isEmpty()) word else "${currentLine} $word"
                        val bounds = textPaint.measureText(testLine)
                        if (bounds <= width) {
                            currentLine.append(if (currentLine.isEmpty()) word else " $word")
                        } else {
                            lines.add(currentLine.toString())
                            currentLine = StringBuilder(word)
                        }
                    }
                    if (currentLine.isNotEmpty()) {
                        lines.add(currentLine.toString())
                    }
                    return lines
                }

                var pageNumber = 1
                var pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                var page = pdfDocument.startPage(pageInfo)
                var canvas = page.canvas
                var yOffset = margin.toFloat()

                // Page Header
                canvas.drawText("ADI JYOTISH GURUS - ASTROLOGY REPORT", margin.toFloat(), yOffset, titlePaint)
                yOffset += 24f
                canvas.drawText("Consultant: ${session.astrologerName} (${session.specialty})", margin.toFloat(), yOffset, subtitlePaint)
                yOffset += 24f
                canvas.drawText("Recipient: ${session.userName} (${session.gender})", margin.toFloat(), yOffset, textPaint)
                yOffset += 16f
                canvas.drawText("Date: ${session.dob} | Time: ${session.tob} | Place: ${session.pob}", margin.toFloat(), yOffset, textPaint)
                yOffset += 16f
                canvas.drawText("Question: \"${session.question}\"", margin.toFloat(), yOffset, textPaint)
                yOffset += 24f

                // Draw horizontal divider line
                paint.color = Color.LTGRAY
                paint.strokeWidth = 1f
                canvas.drawLine(margin.toFloat(), yOffset, (pageWidth - margin).toFloat(), yOffset, paint)
                yOffset += 20f

                // Split paragraphs
                val paragraphs = reportContent.split("\n")
                for (paragraph in paragraphs) {
                    val lines = splitTextIntoLines(paragraph, usableWidth.toFloat())
                    for (line in lines) {
                        // Check for page overflow
                        if (yOffset > pageHeight - margin - 30) {
                            // Finish current page
                            pdfDocument.finishPage(page)
                            // Start new page
                            pageNumber++
                            pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                            page = pdfDocument.startPage(pageInfo)
                            canvas = page.canvas
                            yOffset = margin.toFloat()
                            
                            // Draw tiny running header
                            canvas.drawText("Adi Jyotish Gurus Astrology Report - Page $pageNumber", margin.toFloat(), yOffset, textPaint)
                            yOffset += 20f
                            canvas.drawLine(margin.toFloat(), yOffset, (pageWidth - margin).toFloat(), yOffset, paint)
                            yOffset += 20f
                        }

                        // Check if line is a header (starts with ### or **)
                        if (line.startsWith("#") || line.startsWith("**")) {
                            val cleanLine = line.replace("#", "").replace("*", "").trim()
                            canvas.drawText(cleanLine, margin.toFloat(), yOffset, subtitlePaint)
                        } else {
                            canvas.drawText(line, margin.toFloat(), yOffset, textPaint)
                        }
                        yOffset += 16f
                    }
                    // Paragraph spacing
                    yOffset += 8f
                }

                // Add follow-up if answered
                if (session.followUpQuestion != null && session.followUpResponse != null) {
                    if (yOffset > pageHeight - margin - 150) {
                        pdfDocument.finishPage(page)
                        pageNumber++
                        pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                        page = pdfDocument.startPage(pageInfo)
                        canvas = page.canvas
                        yOffset = margin.toFloat()
                    }
                    yOffset += 16f
                    paint.color = Color.rgb(101, 31, 255)
                    canvas.drawLine(margin.toFloat(), yOffset, (pageWidth - margin).toFloat(), yOffset, paint)
                    yOffset += 20f
                    canvas.drawText("FOLLOW-UP QUESTION & ANSWER", margin.toFloat(), yOffset, subtitlePaint)
                    yOffset += 20f
                    canvas.drawText("Q: ${session.followUpQuestion}", margin.toFloat(), yOffset, textPaint)
                    yOffset += 18f
                    
                    val followUpLines = splitTextIntoLines(session.followUpResponse!!, usableWidth.toFloat())
                    for (line in followUpLines) {
                        if (yOffset > pageHeight - margin - 30) {
                            pdfDocument.finishPage(page)
                            pageNumber++
                            pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                            page = pdfDocument.startPage(pageInfo)
                            canvas = page.canvas
                            yOffset = margin.toFloat()
                        }
                        canvas.drawText(line, margin.toFloat(), yOffset, textPaint)
                        yOffset += 16f
                    }
                }

                // Final footer on last page
                if (yOffset > pageHeight - margin - 40) {
                    pdfDocument.finishPage(page)
                    pageNumber++
                    pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                    page = pdfDocument.startPage(pageInfo)
                    canvas = page.canvas
                    yOffset = margin.toFloat()
                }
                yOffset += 20f
                paint.color = Color.rgb(101, 31, 255)
                canvas.drawLine(margin.toFloat(), yOffset, (pageWidth - margin).toFloat(), yOffset, paint)
                yOffset += 15f
                val footerPaint = Paint().apply {
                    color = Color.GRAY
                    textSize = 8f
                    textSkewX = -0.25f
                    isAntiAlias = true
                }
                canvas.drawText("Disclaimer: This is an AI-generated consultation for spiritual guidance and entertainment purposes only.", margin.toFloat(), yOffset, footerPaint)

                pdfDocument.finishPage(page)

                // Save PDF to shared public downloads or app files
                val fileName = "AdiJyotishGurus_Report_${session.id}.pdf"
                var outputStream: OutputStream? = null

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    val resolver = context.contentResolver
                    val contentValues = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                        put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    }
                    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    if (uri != null) {
                        outputStream = resolver.openOutputStream(uri)
                    }
                } else {
                    val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    val file = File(downloadsDir, fileName)
                    outputStream = FileOutputStream(file)
                }

                if (outputStream != null) {
                    pdfDocument.writeTo(outputStream)
                    pdfDocument.close()
                    outputStream.close()
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "PDF Report successfully saved to Downloads!", Toast.LENGTH_LONG).show()
                    }
                } else {
                    pdfDocument.close()
                    throw Exception("Could not open PDF file output stream.")
                }

            } catch (e: Exception) {
                Log.e("AstrologyViewModel", "Error exporting PDF", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "PDF Export failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
