import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnedSession } from "@/lib/owned-session";
import { Paywall } from "@/components/paywall";
import { ReportView } from "@/components/report-view";
import { isRazorpayConfigured } from "@/lib/razorpay";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const session = await getOwnedSession(id, user);
  if (!session) notFound();

  if (!session.isPaid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Paywall session={session} walletBalance={user.walletBalance} razorpayConfigured={isRazorpayConfigured} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <ReportView session={session} />
    </div>
  );
}
