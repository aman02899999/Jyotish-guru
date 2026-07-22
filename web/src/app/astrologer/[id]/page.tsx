import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getAstrologerById } from "@/lib/astrologers";
import { getConsultationPrice } from "@/lib/pricing-calculator";
import { IntakeForm } from "@/components/intake-form";

export default async function AstrologerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const astrologer = getAstrologerById(Number.parseInt(id, 10));
  if (!astrologer) notFound();

  const price = getConsultationPrice(astrologer.id, astrologer.price, user.subscriptionTier);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-celestial-gold/20 bg-soft-plum p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-celestial-gold/40 bg-gradient-to-br from-soft-plum to-dark-space-purple text-3xl">
          {astrologer.iconSymbol}
        </div>
        <div>
          <p className="font-bold text-galactic-white">{astrologer.name}</p>
          <p className="text-xs font-semibold text-celestial-gold">{astrologer.specialty}</p>
          <p className="mt-1 text-xs text-space-lavender">
            {price === 0 ? (
              <span className="font-bold text-emerald-400">Free with your {user.subscriptionTier} plan</span>
            ) : (
              <>
                ₹{price}
                {price !== astrologer.price && (
                  <span className="ml-1 text-space-lavender/60 line-through">₹{astrologer.price}</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      <IntakeForm astrologerId={astrologer.id} specialty={astrologer.specialty} />
    </div>
  );
}
