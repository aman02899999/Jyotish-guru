package com.example.data

import android.util.Log
import com.example.BuildConfig
import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

// --- Moshi Data Classes for Gemini REST API ---

@JsonClass(generateAdapter = true)
data class Part(
    val text: String
)

@JsonClass(generateAdapter = true)
data class Content(
    val parts: List<Part>
)

@JsonClass(generateAdapter = true)
data class GenerationConfig(
    val temperature: Float = 0.7f,
    val topP: Float = 0.95f,
    val topK: Int = 40
)

@JsonClass(generateAdapter = true)
data class GenerateContentRequest(
    val contents: List<Content>,
    val generationConfig: GenerationConfig? = GenerationConfig(),
    val systemInstruction: Content? = null
)

@JsonClass(generateAdapter = true)
data class Candidate(
    val content: Content?
)

@JsonClass(generateAdapter = true)
data class GenerateContentResponse(
    val candidates: List<Candidate>?
)

// --- Retrofit Interface ---

interface GeminiApi {
    @POST("v1beta/models/gemini-2.5-flash:generateContent")
    suspend fun generateContent(
        @Query("key") apiKey: String,
        @Body request: GenerateContentRequest
    ): GenerateContentResponse
}

// --- Gemini Client Service ---

object GeminiService {
    private const val BASE_URL = "https://generativelanguage.googleapis.com/"

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val api: GeminiApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(GeminiApi::class.java)
    }

    /**
     * Generates a custom Vedic astrology report.
     */
    suspend fun generateAstrologyReport(
        userName: String,
        gender: String,
        dob: String,
        tob: String,
        pob: String,
        question: String,
        partnerDetails: String?,
        astrologerName: String,
        specialty: String,
        style: String, // traditional or modern
        bio: String,
        language: String = "Hinglish"
    ): String {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            Log.e("GeminiService", "API Key is missing or default.")
            return "Error: Gemini API key not configured in AI Studio Secrets."
        }

        val prompt = buildString {
            append("Please generate an astrology report for:")
            append("\n- Name: $userName")
            append("\n- Gender: $gender")
            append("\n- Date of Birth: $dob")
            append("\n- Time of Birth: $tob")
            append("\n- Place of Birth: $pob")
            append("\n- Focus Question: $question")
            if (partnerDetails != null) {
                append("\n- Partner Details (Marriage Matching): $partnerDetails")
            }
            append("\n\nLanguage Preferences:")
            append("\n- Target Language: $language")
            if (language.equals("Hinglish", ignoreCase = true)) {
                append("\n- IMPORTANT: Write the ENTIRE report in Hinglish. Hinglish is Hindi language written in the English/Latin alphabet, naturally mixing common everyday Hindi and English words. For example: 'Aapka Moon sign Virgo hai, aur aaj aapko bohot positive results milenge. Career ke case mein Shani Dev ki drishti favorable hai...'. It should be warm, easy to read, and friendly like a respected Indian pandit chatting on WhatsApp.")
            } else {
                append("\n- IMPORTANT: Translate and write the ENTIRE report strictly in $language. Make sure all headers, bullet points, explanations, and lucky factor labels are translated completely to $language.")
            }
        }

        val systemPrompt = buildSystemInstruction(astrologerName, specialty, style, bio, language)

        val request = GenerateContentRequest(
            contents = listOf(Content(parts = listOf(Part(text = prompt)))),
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt)))
        )

        return try {
            val response = api.generateContent(apiKey, request)
            val result = response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
            result ?: "Unable to formulate the stars. Please try again."
        } catch (e: Exception) {
            Log.e("GeminiService", "Error generating report", e)
            "Error contacting celestial alignment: ${e.localizedMessage ?: e.message}"
        }
    }

    /**
     * Handles follow-up questions referencing the original chart and previous report.
     */
    suspend fun generateFollowUpResponse(
        userName: String,
        dob: String,
        tob: String,
        pob: String,
        originalQuestion: String,
        originalReport: String,
        followUpQuestion: String,
        astrologerName: String,
        specialty: String,
        style: String,
        bio: String,
        language: String = "Hinglish"
    ): String {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            return "Error: Gemini API key not configured."
        }

        val prompt = buildString {
            append("Reference Chart details:")
            append("\n- Name: $userName")
            append("\n- DOB: $dob, TOB: $tob, POB: $pob")
            append("\n- Original Question: $originalQuestion")
            append("\n\nOriginal Generated Report Summary:")
            append("\n$originalReport")
            append("\n\nUser's follow-up question: $followUpQuestion")
            append("\n\nPlease answer this follow-up question specifically in 150-250 words, referencing the original chart placements.")
            append("\n\nLanguage Preferences:")
            append("\n- Target Language: $language")
            if (language.equals("Hinglish", ignoreCase = true)) {
                append("\n- Write the answer completely in Hinglish (Hindi written in English/Latin script). Mix Hindi and English naturally, keeping a respectful and supportive tone.")
            } else {
                append("\n- Write the entire answer strictly in $language.")
            }
        }

        val systemPrompt = buildSystemInstruction(astrologerName, specialty, style, bio, language)

        val request = GenerateContentRequest(
            contents = listOf(Content(parts = listOf(Part(text = prompt)))),
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt)))
        )

        return try {
            val response = api.generateContent(apiKey, request)
            response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: "The constellations are clouded. Please re-ask your follow-up."
        } catch (e: Exception) {
            Log.e("GeminiService", "Error generating follow up", e)
            "Constellation connection issue: ${e.localizedMessage ?: e.message}"
        }
    }

    /**
     * Generates a personalized daily horoscope based on birth data.
     */
    suspend fun generateDailyHoroscope(
        userName: String,
        gender: String,
        dob: String,
        tob: String,
        pob: String,
        language: String = "Hinglish"
    ): String {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            return "Error: Gemini API key not configured in AI Studio Secrets."
        }

        val prompt = buildString {
            append("Please generate a highly personalized, authentic Vedic daily horoscope for:")
            append("\n- Name: $userName")
            append("\n- Gender: $gender")
            append("\n- Date of Birth: $dob")
            append("\n- Time of Birth: $tob")
            append("\n- Place of Birth: $pob")
            append("\n- Current Date: ${java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())}")
            append("\n\nInstructions:")
            append("\n1. Start with a warm, caring greeting from 'Adi Jyotish Gurus'. Mention their Moon sign or Ascendant computed from their birth details to make it deeply custom.")
            append("\n2. Provide today's general lunar energy / cosmic mood.")
            append("\n3. Organize today's personalized forecast into three clear sections with beautiful headers and relevant emojis:")
            append("\n   - 💼 Career & Focus (Favorable endeavors and focus blocks)")
            append("\n   - 💞 Relationship & Connection (Family, friendship, or partnership energies)")
            append("\n   - 🧘 Health & Inner Peace (Sukha) (Mental wellness and physical energy)")
            append("\n4. Conclude with three custom-derived lucky daily factors based on their birth parameters:")
            append("\n   - 🕉️ Favorable Mantra of the Day")
            append("\n   - 🎨 Lucky Color of the Day")
            append("\n   - ⏳ Auspicious Hour of the Day (favorable timing window for important actions)")
            append("\n5. Keep the tone traditional, warm, supportive, and grounded in Vedic tradition. Never make absolute claims or fatalistic guarantees. Always encourage constructive action and mindfulness.")
            append("\n\nLanguage Preferences:")
            append("\n- Target Language: $language")
            if (language.equals("Hinglish", ignoreCase = true)) {
                append("\n- IMPORTANT: Write the entire daily horoscope in natural Hinglish. Use Latin letters, mixing Hindi and English words organically. For example, 'Aapka Moon sign Scorpio hai, toh aaj emotional strength badhegi. Career mein naye options mil sakte hain. Mantra aur lucky factor labels ko bhi Hinglish mein likhein.'")
            } else {
                append("\n- IMPORTANT: Translate and write the entire daily horoscope strictly in $language.")
            }
        }

        val systemPrompt = "You are a warm, traditional Vedic astrologer representing 'Adi Jyotish Gurus', who guides seekers with compassion and absolute precision. Provide deeply personalized daily insights derived from birth parameters in the language $language."

        val request = GenerateContentRequest(
            contents = listOf(Content(parts = listOf(Part(text = prompt)))),
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt)))
        )

        return try {
            val response = api.generateContent(apiKey, request)
            response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: "The stars are temporarily obscured. Please check back shortly for your daily alignment."
        } catch (e: Exception) {
            Log.e("GeminiService", "Error generating daily horoscope", e)
            "The cosmic alignment is temporarily obscured: ${e.localizedMessage ?: e.message}"
        }
    }

    /**
     * Answers Frequently Asked Questions about Vedic Astrology or the app's consultation process.
     */
    suspend fun answerFAQ(
        question: String,
        userName: String,
        language: String = "Hinglish"
    ): String {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            return "Error: Gemini API key not configured in AI Studio Secrets."
        }

        val prompt = buildString {
            append("Seeker Name: $userName")
            append("\nQuestion: $question")
            append("\n\nInstructions:")
            append("\n1. Answer the user's question about Vedic Astrology (Jyotish) or our consultation process.")
            append("\n2. Speak in the warm, experienced, confident, and traditional voice of an ancient Vedic astrologer representing 'Adi Jyotish Gurus'.")
            append("\n3. If the question is about how our consultation process works, explain that:")
            append("\n   - The seeker selects an expert AI Astrologer guide (each with their own specialty like Career, Marriage Kundli, Finance, Vastu, etc.).")
            append("\n   - The seeker fills in their accurate Birth Details (Date, Time, and Place of Birth).")
            append("\n   - The system utilizes advanced celestial algorithms combined with Gemini AI to map precise planetary transits, dasha periods, and natal charts.")
            append("\n   - The consultation generates a comprehensive, multi-section sacred report.")
            append("\n   - Seekers can also ask follow-up questions directly on their generated reports.")
            append("\n4. Use formatted bold headers, bullet points, and appropriate emojis to make the response visually stunning and highly readable.")
            append("\n5. Keep the response concise, engaging, and spiritually inspiring (around 150-250 words).")
            append("\n6. Follow the hard limits: do not give certified medical, financial, or legal advice, and do not make fatalistic guarantees.")
            append("\n\nLanguage Preferences:")
            append("\n- Target Language: $language")
            if (language.equals("Hinglish", ignoreCase = true)) {
                append("\n- Write the entire answer in casual Hinglish using English/Latin alphabet. Mix everyday Hindi and English naturally, e.g., 'Vedic Astrology ek prachin science hai jo humari life ko guide karti hai. Humare app mein aap select kar sakte hain...'")
            } else {
                append("\n- Write the entire answer strictly in $language.")
            }
        }

        val systemPrompt = "You are a wise Vedic Astrologer representing 'Adi Jyotish Gurus'. You provide clear, authentic, and beautifully formatted answers to seekers' questions about Jyotish science and our sacred consultation process in the language: $language."

        val request = GenerateContentRequest(
            contents = listOf(Content(parts = listOf(Part(text = prompt)))),
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt)))
        )

        return try {
            val response = api.generateContent(apiKey, request)
            response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text
                ?: "The cosmic library is temporarily closed. Please rephrase your query."
        } catch (e: Exception) {
            Log.e("GeminiService", "Error answering FAQ", e)
            "The cosmic alignment is temporarily obscured: ${e.localizedMessage ?: e.message}"
        }
    }

    /**
     * Translates any given text dynamically into the target language.
     */
    suspend fun translateText(text: String, targetLanguage: String): String {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_GEMINI_API_KEY") {
            return text
        }
        val prompt = "You are an expert translator. Please translate the following text perfectly into $targetLanguage. Retain all original formatting, emojis, headers, and bullet points. If the target language is Hinglish, translate Hindi written in English letters naturally. Original Text:\n\n$text"
        val request = GenerateContentRequest(
            contents = listOf(Content(parts = listOf(Part(text = prompt))))
        )
        return try {
            val response = api.generateContent(apiKey, request)
            response.candidates?.firstOrNull()?.content?.parts?.firstOrNull()?.text ?: text
        } catch (e: Exception) {
            Log.e("GeminiService", "Error translating text", e)
            text
        }
    }

    private fun buildSystemInstruction(
        name: String,
        specialty: String,
        style: String,
        bio: String,
        language: String = "Hinglish"
    ): String {
        return buildString {
            append("ROLE:\n")
            append("You are $name, an AI astrology guide specializing in $specialty. ")
            append("Bio: $bio ")
            append("You speak in the voice of a warm, experienced Vedic astrologer — confident, specific, culturally fluent in Indian astrological tradition. ")
            
            if (style.contains("Traditional", ignoreCase = true)) {
                append("Use traditional Vedic terminology (Rahu, Ketu, Shani, Mahadasha, Antardasha, Lagna, Rashi, Guna, Kundli Milan, etc.) where appropriate. ")
            } else {
                append("Explain concepts in clean, modern, plain language, avoiding complex jargon, but keeping the traditional Vedic core interpretation intact. ")
            }

            append("\n\nLanguage Instruction:")
            append("\n- You MUST generate the entire output strictly in the requested language: $language. ")
            if (language.equals("Hinglish", ignoreCase = true)) {
                append("Hinglish means Hindi language written in the English/Latin alphabet, naturally mixing common everyday Hindi and English words. For example: 'Aapka Moon sign Scorpio hai, aur aaj career mein growth milegi...'. Write in a warm, friendly, casual WhatsApp-style format as spoken in modern India.")
            } else {
                append("Translate all titles, sections, and explanations completely and perfectly to $language.")
            }

            append("\n\nIDENTITY BOUNDARY (Non-negotiable):\n")
            append("- You are an AI system generating astrological interpretations, not a human being. ")
            append("- If the user directly asks 'are you real / are you human / are you AI,' answer honestly and plainly: you are an AI astrology guide, not a human astrologer. Do not deflect, joke around, or refuse to answer. ")
            append("- Outside of that direct question, stay fully in persona voice — warm, narrative, tradition-grounded. Do not disclaim your nature in every sentence, but NEVER deny it if asked.\n")

            append("\n\nOUTPUT STRUCTURE (For primary reports):\n")
            append("1. Opening (2-3 sentences, warm, referencing their specific computed chart placements — e.g. Moon sign, Ascendant, Sun sign — derived from their birth details, making it feel custom rather than generic).\n")
            append("2. Core Reading for the specialty ($specialty), organized in 3-4 clear sections with beautiful headers (such as planetary transits, dasha period analysis, strength of the houses).\n")
            append("3. Lucky Elements: Explicitly list a Lucky Number, Lucky Color, and Favorable Direction (especially for property or general questions) derived consistently from their birth date. For example, if they have DOB 1996-07-15 (day 15 = 1+5 = 6, Lucky Number 6, Lucky Color Soft Blue or Lilac, Favorable Direction West). Make it sound logical and derived from ancient Vedic numerology.\n")
            append("4. Actionable Takeaway: Provide one grounded, actionable takeaway. Avoid absolute guarantees (e.g. do NOT say 'you will get married on March 15th') - instead use tendency and potential language (e.g. 'this upcoming dasha period starting in March is highly favorable for partnerships').\n")
            append("5. Disclaimers: Print a clear footer stating: 'Disclaimer: This is an AI-generated consultation for spiritual guidance and entertainment. This does not constitute licensed financial, legal, or medical advice.'\n")

            append("\n\nHARD LIMITS:\n")
            append("- NEVER claim certainty about death, serious illness, or guaranteed financial gains.\n")
            append("- NEVER instruct the user to stop medications, avoid doctors, or make major life-changing/irreversible decisions solely on this reading.\n")
            append("- Frame investment and property guidance purely as 'traditionally favorable timings and directions per astrological science', not as licensed financial advice. Do NOT recommend specific stocks, schemes, or financial products.\n")
            append("- CRITICAL: If the user describes self-harm ideation or crisis language at any point, immediately DROP the persona, stop the astrology, and provide a direct, deeply caring response with standard crisis resources (e.g., 'If you are going through a difficult time, please reach out to trusted professionals or call your local helpline (e.g., AASRA in India at +91-9820466726, or 988 in the US) for support. You are valuable.').\n")
        }
    }
}
