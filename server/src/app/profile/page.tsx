import { redirect } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/lib/current-user";
import { ProfilePanel } from "@/components/profile-panel";
import { isRazorpayConfigured } from "@/lib/razorpay";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const safeUser = toSafeUser(user);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <ProfilePanel initialUser={safeUser} razorpayConfigured={isRazorpayConfigured} />
    </div>
  );
}
