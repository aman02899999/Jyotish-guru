import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getAstrologersWithStats } from "@/lib/astrologer-stats";
import { calculatePanchang, panchangExplanation } from "@/lib/panchang-calculator";
import { PanchangCard } from "@/components/panchang-card";
import { DailyHoroscopeCard } from "@/components/daily-horoscope-card";
import { AstrologerBrowser } from "@/components/astrologer-browser";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const astrologers = await getAstrologersWithStats();

  const todayStr = new Date().toISOString().slice(0, 10);
  const elements = calculatePanchang(todayStr);
  const explanation = panchangExplanation(elements, user.preferredLanguage);
  const panchang = { date: todayStr, ...elements, explanation };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-extrabold text-celestial-gold sm:text-3xl">Namaste, {user.name}</h1>
        <p className="text-sm text-space-lavender">Select an AI Guide to reveal your celestial path.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PanchangCard initial={panchang} />
        <DailyHoroscopeCard />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-galactic-white">Choose Your AI Astrologer</h2>
        <AstrologerBrowser astrologers={astrologers} />
      </div>
    </div>
  );
}
