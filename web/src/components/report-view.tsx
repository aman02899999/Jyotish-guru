"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReportSession } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BirthChart } from "@/components/birth-chart";
import { Printer, Star } from "lucide-react";

export function ReportView({ session }: { session: ReportSession }) {
  const router = useRouter();
  const [followUpText, setFollowUpText] = useState("");
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const [rating, setRating] = useState(session.rating ?? 0);
  const [isRating, setIsRating] = useState(false);

  async function submitFollowUp(event: React.FormEvent) {
    event.preventDefault();
    if (!followUpText.trim()) return;
    setIsSubmittingFollowUp(true);
    setFollowUpError(null);
    try {
      const response = await fetch(`/api/sessions/${session.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: followUpText }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFollowUpError(data.error ?? "Something went wrong.");
        setIsSubmittingFollowUp(false);
        return;
      }
      router.refresh();
    } catch {
      setFollowUpError("Network error. Please try again.");
      setIsSubmittingFollowUp(false);
    }
  }

  async function submitRating(star: number) {
    if (session.rating !== null || isRating) return;
    setRating(star);
    setIsRating(true);
    try {
      await fetch(`/api/sessions/${session.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: star }),
      });
      router.refresh();
    } finally {
      setIsRating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-wide text-ink">Your Consultation</h1>
          <p className="text-xs text-saffron">
            {session.astrologerName} · {session.specialty}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Save as PDF
        </Button>
      </div>

      <BirthChart dob={session.dob} tob={session.tob} />

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-display mb-4 text-lg font-semibold tracking-wide text-saffron">
            Vedic Reading &amp; Kundli Analysis
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{session.reportText}</p>
        </CardContent>
      </Card>

      <Card className="no-print p-5 text-center">
        <p className="text-sm font-bold text-saffron">
          {session.rating === null ? "Rate your consultation session" : "Your Rating"}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={session.rating !== null}
              onClick={() => submitRating(star)}
              className="disabled:cursor-default"
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`h-7 w-7 ${star <= rating ? "fill-saffron text-saffron" : "text-clay/40"}`}
              />
            </button>
          ))}
        </div>
        {session.rating !== null && (
          <p className="mt-2 text-xs text-clay">
            Thank you! Your feedback helps other seekers and refines our astrologer standings.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-rust">💬 Included Follow-Up Question</p>
        <p className="mt-1 text-xs text-clay">
          You&apos;re entitled to ask exactly 1 follow-up question referencing this chart, included in your consultation fee.
        </p>

        {!session.followUpQuestion ? (
          <form onSubmit={submitFollowUp} className="no-print mt-4 space-y-3">
            <Textarea
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              placeholder="Ask your follow-up..."
            />
            {followUpError && <p className="text-xs text-red-600">{followUpError}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={!followUpText.trim() || isSubmittingFollowUp}
            >
              {isSubmittingFollowUp ? "Consulting..." : "Submit Follow-up"}
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl bg-cream p-4">
            <div>
              <p className="text-xs font-bold text-rust">Your Question:</p>
              <p className="mt-1 text-sm text-ink">{session.followUpQuestion}</p>
            </div>
            <div className="border-t border-clay/15 pt-3">
              <p className="text-xs font-bold text-saffron">Astrologer&apos;s Response:</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">
                {session.followUpResponse}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
