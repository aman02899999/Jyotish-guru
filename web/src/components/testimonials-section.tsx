import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TiltCard } from "@/components/tilt-card";
import { FadeIn } from "@/components/fade-in";
import type { FeaturedReview } from "@/lib/reviews";

/**
 * Renders nothing until there's at least one real, user-submitted review -
 * see lib/reviews.ts. No seeded/placeholder testimonials, so a fresh
 * deployment with no reviews yet simply omits this section rather than
 * showing fabricated social proof.
 */
export function TestimonialsSection({ reviews }: { reviews: FeaturedReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="mt-24">
      <FadeIn>
        <h2 className="font-display text-center text-2xl font-semibold tracking-wide text-ink">
          What seekers are saying
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-clay">
          Real reviews from consultations completed on Adi Jyotish Gurus.
        </p>
      </FadeIn>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review, index) => (
          <FadeIn key={review.id} delay={index * 0.06}>
            <TiltCard>
              <Card className="flex h-full flex-col gap-3 p-5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3.5 w-3.5 ${
                        star <= review.rating ? "fill-saffron text-saffron" : "text-clay/30"
                      }`}
                    />
                  ))}
                </div>

                <p className="flex-1 text-sm leading-relaxed text-ink">&ldquo;{review.reviewText}&rdquo;</p>

                <div className="flex items-center justify-between border-t border-clay/15 pt-3">
                  <div>
                    <p className="text-xs font-bold text-ink">{review.reviewerName}</p>
                    <p className="text-[10px] text-clay">
                      {review.astrologerName} &middot; {review.specialty}
                    </p>
                  </div>
                  {review.subscriptionTier !== "Free" && (
                    <span className="shrink-0 rounded-full border border-saffron/30 bg-saffron/10 px-2 py-0.5 text-[9px] font-bold text-saffron">
                      {review.subscriptionTier}
                    </span>
                  )}
                </div>
              </Card>
            </TiltCard>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
