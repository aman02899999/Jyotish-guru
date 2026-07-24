import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASTROLOGERS } from "@/lib/astrologers";
import { FadeIn } from "@/components/fade-in";
import { NavagrahaHero } from "@/components/navagraha-scene";

const FEATURES = [
  {
    icon: "🪐",
    title: "AI Astrologer Marketplace",
    description: "Ten specialized AI Vedic guides - career, marriage matching, finance, Vastu, numerology, and more.",
  },
  {
    icon: "📅",
    title: "Live Vedic Panchang",
    description: "Daily tithi, nakshatra, yoga, karana, and Rahu Kaal - computed from real sun/moon ephemeris math.",
  },
  {
    icon: "💬",
    title: "Follow-up Q&A",
    description: "Every consultation includes one free follow-up question that references your original chart.",
  },
  {
    icon: "🔒",
    title: "Your Data, Your Account",
    description: "Simple email/password login. Your birth details and reports are private to your account.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <NavagrahaHero>
        <FadeIn>
          <section className="relative pt-24 text-center sm:pt-32">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-saffron/30 bg-paper/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-saffron backdrop-blur-sm">
              ✨ AI-Powered Vedic Astrology
            </span>

            <div className="mt-8 flex justify-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-saffron/40 bg-gradient-to-br from-saffron/20 via-paper to-transparent text-4xl shadow-[0_0_50px_-8px_rgba(234,88,12,0.6)]">
                🕉️
              </span>
            </div>

            <h1 className="font-display mt-6 bg-gradient-to-b from-[#fed7aa] via-saffron to-terracotta bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-6xl">
              Adi Jyotish Gurus
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-clay sm:text-lg">
              Find world-class AI Vedic astrologers. Get a personalized birth chart reading, daily
              horoscope, and live Panchang calendar - powered by Gemini AI.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/signup" className={buttonVariants({ size: "lg" })}>
                Start Your Free Reading
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                I already have an account
              </Link>
            </div>
            <p className="mt-3 text-xs text-clay/70">
              Free to sign up. Consultations are AI-generated for guidance and entertainment purposes.
            </p>
          </section>
        </FadeIn>
      </NavagrahaHero>

      <section className="mt-24 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <FadeIn key={feature.title} delay={index * 0.08}>
            <Card className="h-full transition-transform duration-300 hover:-translate-y-1 hover:border-saffron/40">
              <CardHeader>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-saffron/30 bg-gradient-to-br from-saffron/15 to-transparent text-xl">
                  {feature.icon}
                </span>
                <CardTitle className="mt-3">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </section>

      <section className="mt-24">
        <FadeIn>
          <h2 className="font-display text-center text-2xl font-semibold tracking-wide text-ink">
            Meet a few of our AI Gurus
          </h2>
        </FadeIn>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ASTROLOGERS.slice(0, 6).map((astrologer, index) => (
            <FadeIn key={astrologer.id} delay={index * 0.06}>
              <Card className="flex items-center gap-4 p-4 transition-transform duration-300 hover:-translate-y-0.5 hover:border-saffron/40">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-saffron/40 bg-gradient-to-br from-paper to-sand text-2xl shadow-[0_0_20px_-6px_rgba(234,88,12,0.4)]">
                  {astrologer.iconSymbol}
                </div>
                <div>
                  <p className="font-semibold text-ink">{astrologer.name}</p>
                  <p className="text-xs text-saffron">{astrologer.specialty}</p>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      <FadeIn>
        <section className="relative mt-24 overflow-hidden rounded-3xl border border-saffron/30 bg-gradient-to-b from-paper to-cream p-10 text-center shadow-[inset_0_1px_0_0_rgba(234,88,12,0.15),0_30px_60px_-30px_rgba(42,27,18,0.18)]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -z-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-saffron/20 blur-[100px]"
          />
          <h2 className="font-display relative text-2xl font-semibold tracking-wide text-saffron">
            Ready to reveal your celestial path?
          </h2>
          <p className="relative mx-auto mt-2 max-w-xl text-sm text-clay">
            Create a free account, share your birth details, and get your first AI-guided Vedic reading in minutes.
          </p>
          <Link href="/signup" className={`${buttonVariants({ size: "lg" })} relative mt-6`}>
            Create My Account
          </Link>
        </section>
      </FadeIn>
    </div>
  );
}
