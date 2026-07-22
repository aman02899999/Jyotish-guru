import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ASTROLOGERS } from "@/lib/astrologers";
import { FadeIn } from "@/components/fade-in";

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
      <FadeIn>
        <section className="text-center">
          <span className="text-6xl">🕉️</span>
          <h1 className="mt-6 bg-gradient-to-b from-celestial-gold to-mystic-amber bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-6xl">
            Adi Jyotish Gurus
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-space-lavender sm:text-lg">
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
          <p className="mt-3 text-xs text-space-lavender/70">
            Free to sign up. Consultations are AI-generated for guidance and entertainment purposes.
          </p>
        </section>
      </FadeIn>

      <section className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <FadeIn key={feature.title} delay={index * 0.08}>
            <Card className="h-full">
              <CardHeader>
                <span className="text-2xl">{feature.icon}</span>
                <CardTitle className="mt-2">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </section>

      <section className="mt-20">
        <FadeIn>
          <h2 className="text-center text-2xl font-bold text-galactic-white">Meet a few of our AI Gurus</h2>
        </FadeIn>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ASTROLOGERS.slice(0, 6).map((astrologer, index) => (
            <FadeIn key={astrologer.id} delay={index * 0.06}>
              <Card className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-celestial-gold/40 bg-gradient-to-br from-soft-plum to-dark-space-purple text-2xl">
                  {astrologer.iconSymbol}
                </div>
                <div>
                  <p className="font-bold text-galactic-white">{astrologer.name}</p>
                  <p className="text-xs text-celestial-gold">{astrologer.specialty}</p>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      <FadeIn>
        <section className="mt-20 rounded-3xl border border-celestial-gold/30 bg-soft-plum/60 p-10 text-center">
          <h2 className="text-2xl font-bold text-celestial-gold">Ready to reveal your celestial path?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-space-lavender">
            Create a free account, share your birth details, and get your first AI-guided Vedic reading in minutes.
          </p>
          <Link href="/signup" className={`${buttonVariants({ size: "lg" })} mt-6`}>
            Create My Account
          </Link>
        </section>
      </FadeIn>
    </div>
  );
}
