import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getAstrologersWithStats, type AstrologerWithStats } from "@/lib/astrologer-stats";
import { getFavoriteAstrologerIds } from "@/lib/favorites";
import { recordDailyVisit } from "@/lib/record-daily-visit";
import { calculatePanchang, panchangExplanation } from "@/lib/panchang-calculator";
import { AstrologerCard } from "@/components/astrologer-card";
import { PanchangCard } from "@/components/panchang-card";
import { DailyHoroscopeCard } from "@/components/daily-horoscope-card";
import { NumerologyCard } from "@/components/numerology-card";
import { AstrologerBrowser } from "@/components/astrologer-browser";
import { FadeIn } from "@/components/fade-in";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const favoriteIds = await getFavoriteAstrologerIds(user.id);
  const astrologers = await getAstrologersWithStats(favoriteIds);
  const favoriteAstrologers = astrologers.filter((a) => a.isFavorited);

  const todayStr = new Date().toISOString().slice(0, 10);
  const elements = calculatePanchang(todayStr);
  const explanation = panchangExplanation(elements, user.preferredLanguage);
  const panchang = { date: todayStr, ...elements, explanation };

  const streak = await recordDailyVisit(user.id, user.lastActiveDate, user.currentStreak, user.longestStreak);

  const daysAsSeeker = Math.max(
    1,
    Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 overflow-x-hidden px-4 py-8 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-saffron/10 blur-[120px]"
      />

      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rust">
              {timeOfDayGreeting()}
            </p>
            <h1 className="font-display mt-1 text-2xl font-semibold tracking-wide text-saffron sm:text-3xl">
              Namaste, {user.name}
            </h1>
            <p className="mt-1 text-sm text-clay">Select an AI Guide to reveal your celestial path.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatChip icon="🪙" label="Wallet" value={`₹${user.walletBalance}`} />
            <StatChip icon="🧘" label="Plan" value={user.subscriptionTier} />
            <StatChip icon="🌙" label="Seeker Since" value={`Day ${daysAsSeeker}`} />
            <StatChip
              icon="🔥"
              label="Streak"
              value={
                streak.longestStreak > streak.currentStreak
                  ? `${streak.currentStreak}d · best ${streak.longestStreak}`
                  : `${streak.currentStreak} day${streak.currentStreak === 1 ? "" : "s"}`
              }
            />
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn delay={0.05} className="lg:col-span-2">
          <PanchangCard initial={panchang} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <DailyHoroscopeCard />
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn delay={0.15} className="lg:col-span-1">
          <NumerologyCard userName={user.name} />
        </FadeIn>
        <FadeIn delay={0.2} className="lg:col-span-2">
          <QuickFactsCard tithi={elements.tithi} nakshatra={elements.nakshatra} moonSign={elements.moonSign} />
        </FadeIn>
      </div>

      {favoriteAstrologers.length > 0 && (
        <FadeIn delay={0.22}>
          <div>
            <h2 className="font-display mb-4 text-lg font-semibold tracking-wide text-ink">
              🤍 Your Guides
            </h2>
            <FavoriteAstrologerGrid astrologers={favoriteAstrologers} />
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.25}>
        <div>
          <h2 className="font-display mb-4 text-lg font-semibold tracking-wide text-ink">
            Choose Your AI Astrologer
          </h2>
          <AstrologerBrowser astrologers={astrologers} />
        </div>
      </FadeIn>
    </div>
  );
}

function FavoriteAstrologerGrid({ astrologers }: { astrologers: AstrologerWithStats[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {astrologers.map((astrologer) => (
        <AstrologerCard key={astrologer.id} astrologer={astrologer} />
      ))}
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-saffron/20 bg-paper/60 px-3 py-2 backdrop-blur-sm">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-[9px] uppercase tracking-wide text-clay">{label}</p>
        <p className="text-xs font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}

function QuickFactsCard({ tithi, nakshatra, moonSign }: { tithi: string; nakshatra: string; moonSign: string }) {
  return (
    <div className="h-full rounded-2xl border border-saffron/20 bg-gradient-to-br from-paper/60 via-paper/40 to-sand/60 p-5 backdrop-blur-sm">
      <p className="font-bold text-saffron">✨ Why This Matters Today</p>
      <p className="mt-2 text-xs leading-relaxed text-clay">
        With the Moon transiting <span className="text-ink">{moonSign}</span> under{" "}
        <span className="text-ink">{nakshatra}</span> Nakshatra during{" "}
        <span className="text-ink">{tithi}</span>, today carries a distinct energetic signature. Your AI
        astrologer factors these live transits into every reading - not a generic, one-size-fits-all script.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Live Transits", "Vedic Panchang", "Personalized Kundli", "AI-Powered"].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-saffron/30 bg-saffron/10 px-2.5 py-1 text-[10px] font-bold text-saffron"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
