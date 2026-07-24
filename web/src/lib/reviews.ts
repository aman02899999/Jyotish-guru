import "server-only";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/review-display-name";

export interface FeaturedReview {
  id: string;
  reviewerName: string;
  subscriptionTier: string;
  astrologerName: string;
  specialty: string;
  rating: number;
  reviewText: string;
}

/**
 * Real, user-submitted reviews only - never fabricated. Only a session the
 * account holder actually paid for, completed, and rated (with written
 * feedback) can appear here; see the rating API route for how reviewText
 * gets set. "Featured" just means curated toward the highest-rated ones for
 * a landing-page highlight reel, not a synthetic or seeded set.
 */
export async function getFeaturedReviews(limit = 6): Promise<FeaturedReview[]> {
  // The landing page is the anonymous entry point and calls this on every
  // load - a transient DB hiccup here should just hide the section, not
  // take down the whole page for every visitor.
  try {
    const sessions = await prisma.reportSession.findMany({
      where: {
        isPaid: true,
        rating: { gte: 4 },
        reviewText: { not: null },
      },
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { user: { select: { name: true, subscriptionTier: true } } },
    });

    return sessions
      .filter((s) => s.rating !== null && s.reviewText && s.reviewText.trim().length > 0)
      .map((s) => ({
        id: s.id,
        reviewerName: displayName(s.user.name),
        subscriptionTier: s.user.subscriptionTier,
        astrologerName: s.astrologerName,
        specialty: s.specialty,
        rating: s.rating as number,
        reviewText: s.reviewText as string,
      }));
  } catch {
    return [];
  }
}
