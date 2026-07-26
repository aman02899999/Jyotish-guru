package com.example.data

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

// --- Entities ---

@Entity(tableName = "user_profile")
data class UserProfile(
    @PrimaryKey val id: Int = 1, // Single user profile
    val name: String,
    val phone: String,
    val consented: Boolean,
    val isLoggedIn: Boolean = false,
    val subscriptionTier: String = "Free", // "Free", "Nakshatra Bronze", "Rashifal Silver", "Mahadasha Gold"
    val subscriptionExpiry: Long = 0L,
    val walletBalance: Int = 0, // Wallet money in ₹
    val referralClaimed: Boolean = false,
    val preferredLanguage: String = "Hinglish",

    // --- Daily engagement streak (mirrors the web app's reward ladder) ---
    val streakCount: Int = 0,
    val streakBest: Int = 0,
    val streakLastDay: String = "", // yyyy-MM-dd of the last counted visit
    val unlockedRewards: String = "" // comma-separated reward ids
)

@Entity(tableName = "report_sessions")
data class ReportSession(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val userName: String,
    val gender: String,
    val dob: String,
    val tob: String,
    val pob: String,
    val question: String,
    
    // Partner Details (for Marriage Matching)
    val partnerName: String? = null,
    val partnerDob: String? = null,
    val partnerTob: String? = null,
    val partnerPob: String? = null,
    
    // Astrologer Details
    val astrologerId: Int,
    val astrologerName: String,
    val specialty: String,
    val price: Int,
    
    val timestamp: Long = System.currentTimeMillis(),
    val reportText: String? = null,
    val isPaid: Boolean = false,
    val rating: Int? = null, // null means "not rated yet"
    
    // Follow-up question details
    val followUpQuestion: String? = null,
    val followUpResponse: String? = null
)

// --- DAO Interface ---

@Dao
interface AstrologyDao {
    // User Profile Queries
    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    fun getUserProfileFlow(): Flow<UserProfile?>

    @Query("SELECT * FROM user_profile WHERE id = 1 LIMIT 1")
    suspend fun getUserProfile(): UserProfile?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveUserProfile(profile: UserProfile)

    @Query("DELETE FROM user_profile")
    suspend fun clearUserProfile()

    // Report Session Queries
    @Query("SELECT * FROM report_sessions ORDER BY timestamp DESC")
    fun getAllSessionsFlow(): Flow<List<ReportSession>>

    @Query("SELECT * FROM report_sessions WHERE id = :sessionId LIMIT 1")
    suspend fun getSessionById(sessionId: Int): ReportSession?

    @Query("SELECT * FROM report_sessions WHERE id = :sessionId LIMIT 1")
    fun getSessionFlowById(sessionId: Int): Flow<ReportSession?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveSession(session: ReportSession): Long

    @Query("UPDATE report_sessions SET isPaid = 1 WHERE id = :sessionId")
    suspend fun markSessionAsPaid(sessionId: Int)

    @Query("UPDATE report_sessions SET rating = :rating WHERE id = :sessionId")
    suspend fun updateSessionRating(sessionId: Int, rating: Int)

    @Query("UPDATE report_sessions SET followUpQuestion = :question, followUpResponse = :response WHERE id = :sessionId")
    suspend fun saveFollowUp(sessionId: Int, question: String, response: String)

    @Query("SELECT rating FROM report_sessions WHERE astrologerId = :astrologerId AND rating IS NOT NULL")
    suspend fun getRatingsForAstrologer(astrologerId: Int): List<Int>

    @Query("SELECT COUNT(*) FROM report_sessions WHERE astrologerId = :astrologerId AND isPaid = 1")
    suspend fun getSessionCountForAstrologer(astrologerId: Int): Int
}

// --- Database Class ---

@Database(entities = [UserProfile::class, ReportSession::class], version = 6, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun astrologyDao(): AstrologyDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "astrology_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
