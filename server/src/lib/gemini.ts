import "server-only";

/**
 * Server-only Gemini client, ported from the Android app's GeminiService.kt.
 * The API key never reaches the browser - every call here runs inside a
 * Next.js API route (Node runtime), unlike the Android app which calls the
 * Gemini REST API directly from the client with an embedded BuildConfig key.
 */

const BASE_URL = "https://generativelanguage.googleapis.com";
const MODEL = "gemini-2.5-flash";

interface GenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function generateContent(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "Error: Gemini API key not configured. Set GEMINI_API_KEY in your environment.";
  }

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topP: 0.95, topK: 40 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  try {
    const response = await fetch(
      `${BASE_URL}/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error", response.status, errorText);
      return `Error contacting celestial alignment (status ${response.status}). Please try again.`;
    }

    const data = (await response.json()) as GenerateContentResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? "Unable to formulate the stars. Please try again.";
  } catch (error) {
    console.error("Gemini request failed", error);
    return "Error contacting celestial alignment. Please check your connection and try again.";
  }
}

function buildSystemInstruction(
  astrologerName: string,
  specialty: string,
  style: string,
  bio: string,
  language: string
): string {
  const lines: string[] = [];
  lines.push("ROLE:");
  lines.push(`You are ${astrologerName}, an AI astrology guide specializing in ${specialty}. Bio: ${bio} You speak in the voice of a warm, experienced Vedic astrologer - confident, specific, culturally fluent in Indian astrological tradition.`);

  if (style.includes("Traditional")) {
    lines.push("Use traditional Vedic terminology (Rahu, Ketu, Shani, Mahadasha, Antardasha, Lagna, Rashi, Guna, Kundli Milan, etc.) where appropriate.");
  } else {
    lines.push("Explain concepts in clean, modern, plain language, avoiding complex jargon, but keeping the traditional Vedic core interpretation intact.");
  }

  lines.push("\nLanguage Instruction:");
  lines.push(`You MUST generate the entire output strictly in the requested language: ${language}.`);
  if (language.toLowerCase() === "hinglish") {
    lines.push(
      "Hinglish means Hindi language written in the English/Latin alphabet, naturally mixing common everyday Hindi and English words. For example: 'Aapka Moon sign Scorpio hai, aur aaj career mein growth milegi...'. Write in a warm, friendly, casual WhatsApp-style format as spoken in modern India."
    );
  } else {
    lines.push(`Translate all titles, sections, and explanations completely and perfectly to ${language}.`);
  }

  lines.push("\nIDENTITY BOUNDARY (Non-negotiable):");
  lines.push("You are an AI system generating astrological interpretations, not a human being. If the user directly asks 'are you real / are you human / are you AI,' answer honestly and plainly: you are an AI astrology guide, not a human astrologer. Do not deflect, joke around, or refuse to answer. Outside of that direct question, stay fully in persona voice - warm, narrative, tradition-grounded. Do not disclaim your nature in every sentence, but NEVER deny it if asked.");

  lines.push("\nOUTPUT STRUCTURE (For primary reports):");
  lines.push("1. Opening (2-3 sentences, warm, referencing their specific computed chart placements - e.g. Moon sign, Ascendant, Sun sign - derived from their birth details, making it feel custom rather than generic).");
  lines.push(`2. Core Reading for the specialty (${specialty}), organized in 3-4 clear sections with beautiful headers (such as planetary transits, dasha period analysis, strength of the houses).`);
  lines.push("3. Lucky Elements: Explicitly list a Lucky Number, Lucky Color, and Favorable Direction derived consistently from their birth date, making it sound logical and derived from ancient Vedic numerology.");
  lines.push("4. Actionable Takeaway: Provide one grounded, actionable takeaway. Avoid absolute guarantees - instead use tendency and potential language.");
  lines.push("5. Disclaimers: Print a clear footer stating: 'Disclaimer: This is an AI-generated consultation for spiritual guidance and entertainment. This does not constitute licensed financial, legal, or medical advice.'");

  lines.push("\nHARD LIMITS:");
  lines.push("- NEVER claim certainty about death, serious illness, or guaranteed financial gains.");
  lines.push("- NEVER instruct the user to stop medications, avoid doctors, or make major life-changing/irreversible decisions solely on this reading.");
  lines.push("- Frame investment and property guidance purely as 'traditionally favorable timings and directions per astrological science', not as licensed financial advice. Do NOT recommend specific stocks, schemes, or financial products.");
  lines.push("- CRITICAL: If the user describes self-harm ideation or crisis language at any point, immediately DROP the persona, stop the astrology, and provide a direct, deeply caring response with standard crisis resources (e.g., 'If you are going through a difficult time, please reach out to trusted professionals or call your local helpline (e.g., AASRA in India at +91-9820466726, or 988 in the US) for support. You are valuable.').");

  return lines.join("\n");
}

export interface ReportRequest {
  userName: string;
  gender: string;
  dob: string;
  tob: string;
  pob: string;
  question: string;
  partnerDetails?: string | null;
  astrologerName: string;
  specialty: string;
  style: string;
  bio: string;
  language: string;
}

export async function generateAstrologyReport(req: ReportRequest): Promise<string> {
  const prompt = [
    "Please generate an astrology report for:",
    `- Name: ${req.userName}`,
    `- Gender: ${req.gender}`,
    `- Date of Birth: ${req.dob}`,
    `- Time of Birth: ${req.tob}`,
    `- Place of Birth: ${req.pob}`,
    `- Focus Question: ${req.question}`,
    req.partnerDetails ? `- Partner Details (Marriage Matching): ${req.partnerDetails}` : null,
    "",
    "Language Preferences:",
    `- Target Language: ${req.language}`,
    req.language.toLowerCase() === "hinglish"
      ? "- IMPORTANT: Write the ENTIRE report in Hinglish. Hinglish is Hindi language written in the English/Latin alphabet, naturally mixing common everyday Hindi and English words. It should be warm, easy to read, and friendly like a respected Indian pandit chatting on WhatsApp."
      : `- IMPORTANT: Translate and write the ENTIRE report strictly in ${req.language}. Make sure all headers, bullet points, explanations, and lucky factor labels are translated completely to ${req.language}.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const systemInstruction = buildSystemInstruction(
    req.astrologerName,
    req.specialty,
    req.style,
    req.bio,
    req.language
  );

  return generateContent(prompt, systemInstruction);
}

export interface FollowUpRequest {
  userName: string;
  dob: string;
  tob: string;
  pob: string;
  originalQuestion: string;
  originalReport: string;
  followUpQuestion: string;
  astrologerName: string;
  specialty: string;
  style: string;
  bio: string;
  language: string;
}

export async function generateFollowUpResponse(req: FollowUpRequest): Promise<string> {
  const prompt = [
    "Reference Chart details:",
    `- Name: ${req.userName}`,
    `- DOB: ${req.dob}, TOB: ${req.tob}, POB: ${req.pob}`,
    `- Original Question: ${req.originalQuestion}`,
    "",
    "Original Generated Report Summary:",
    req.originalReport,
    "",
    `User's follow-up question: ${req.followUpQuestion}`,
    "",
    "Please answer this follow-up question specifically in 150-250 words, referencing the original chart placements.",
    "",
    "Language Preferences:",
    `- Target Language: ${req.language}`,
    req.language.toLowerCase() === "hinglish"
      ? "- Write the answer completely in Hinglish (Hindi written in English/Latin script). Mix Hindi and English naturally, keeping a respectful and supportive tone."
      : `- Write the entire answer strictly in ${req.language}.`,
  ].join("\n");

  const systemInstruction = buildSystemInstruction(
    req.astrologerName,
    req.specialty,
    req.style,
    req.bio,
    req.language
  );

  return generateContent(prompt, systemInstruction);
}

export type HoroscopePeriod = "daily" | "weekly" | "monthly";

function describeForecastRange(period: HoroscopePeriod): string {
  const today = new Date();
  if (period === "weekly") {
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    return `${today.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;
  }
  if (period === "monthly") {
    return today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return today.toISOString().slice(0, 10);
}

export async function generateHoroscope(
  userName: string,
  gender: string,
  dob: string,
  tob: string,
  pob: string,
  language: string,
  period: HoroscopePeriod = "daily"
): Promise<string> {
  const periodWord = period === "daily" ? "daily" : period === "weekly" ? "weekly" : "monthly";
  const periodNoun = period === "weekly" ? "week" : period === "monthly" ? "month" : "day";

  const prompt = [
    `Please generate a highly personalized, authentic Vedic ${periodWord} horoscope for:`,
    `- Name: ${userName}`,
    `- Gender: ${gender}`,
    `- Date of Birth: ${dob}`,
    `- Time of Birth: ${tob}`,
    `- Place of Birth: ${pob}`,
    `- Forecast Period: ${describeForecastRange(period)}`,
    "",
    "Instructions:",
    "1. Start with a warm, caring greeting from 'Adi Jyotish Gurus'. Mention their Moon sign or Ascendant computed from their birth details to make it deeply custom.",
    `2. Provide the general lunar/planetary energy and cosmic mood for this ${periodNoun}.`,
    `3. Organize the forecast for this ${periodNoun} into three clear sections with beautiful headers and relevant emojis: Career & Focus, Relationship & Connection, Health & Inner Peace (Sukha).`,
    period === "daily"
      ? "4. Conclude with three custom-derived lucky daily factors: Favorable Mantra of the Day, Lucky Color of the Day, Auspicious Hour of the Day."
      : `4. Conclude by naming the single most important date within this ${periodNoun} to watch, and why.`,
    "5. Keep the tone traditional, warm, supportive, and grounded in Vedic tradition. Never make absolute claims or fatalistic guarantees.",
    "",
    "Language Preferences:",
    `- Target Language: ${language}`,
    language.toLowerCase() === "hinglish"
      ? "- IMPORTANT: Write the entire horoscope in natural Hinglish, mixing Hindi and English words organically."
      : `- IMPORTANT: Translate and write the entire horoscope strictly in ${language}.`,
  ].join("\n");

  const systemInstruction = `You are a warm, traditional Vedic astrologer representing 'Adi Jyotish Gurus', who guides seekers with compassion and absolute precision. Provide deeply personalized ${periodWord} insights derived from birth parameters in the language ${language}.`;

  return generateContent(prompt, systemInstruction);
}

export async function answerFAQ(question: string, userName: string, language: string): Promise<string> {
  const prompt = [
    `Seeker Name: ${userName}`,
    `Question: ${question}`,
    "",
    "Instructions:",
    "1. Answer the user's question about Vedic Astrology (Jyotish) or our consultation process.",
    "2. Speak in the warm, experienced, confident, and traditional voice of an ancient Vedic astrologer representing 'Adi Jyotish Gurus'.",
    "3. Use formatted bold headers, bullet points, and appropriate emojis to make the response visually stunning and highly readable.",
    "4. Keep the response concise, engaging, and spiritually inspiring (around 150-250 words).",
    "5. Follow the hard limits: do not give certified medical, financial, or legal advice, and do not make fatalistic guarantees.",
    "",
    "Language Preferences:",
    `- Target Language: ${language}`,
    language.toLowerCase() === "hinglish"
      ? "- Write the entire answer in casual Hinglish using English/Latin alphabet."
      : `- Write the entire answer strictly in ${language}.`,
  ].join("\n");

  const systemInstruction = `You are a wise Vedic Astrologer representing 'Adi Jyotish Gurus'. You provide clear, authentic, and beautifully formatted answers to seekers' questions about Jyotish science in the language: ${language}.`;

  return generateContent(prompt, systemInstruction);
}
