"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { RazorpayCheckoutButton } from "@/components/razorpay-checkout-button";
import { WalletHistory } from "@/components/wallet-history";
import { SUBSCRIPTION_TIERS, CREDITS_PACKS } from "@/lib/subscriptions";
import { generateReferralCode } from "@/lib/referral-code";
import type { SafeUser } from "@/lib/current-user";

export function ProfilePanel({
  initialUser,
  razorpayConfigured,
}: {
  initialUser: SafeUser;
  razorpayConfigured: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletRefreshToken, setWalletRefreshToken] = useState(0);

  const isSubscribed = user.subscriptionTier !== "Free";
  const referralCode = generateReferralCode(user.name);

  async function post(url: string, body?: unknown) {
    setError(null);
    setMessage(null);
    setBusy(url);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (data.user) setUser(data.user);
      if (data.message) setMessage(data.message);
      setWalletRefreshToken((n) => n + 1);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshUser() {
    setError(null);
    try {
      const response = await fetch("/api/profile");
      const data = await response.json();
      if (response.ok) setUser(data.user);
      setWalletRefreshToken((n) => n + 1);
      router.refresh();
    } catch {
      setError("Payment went through, but refreshing your profile failed. Reload the page.");
    }
  }

  async function updateLanguage(language: string) {
    setBusy("language");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: language }),
      });
      const data = await response.json();
      if (response.ok) setUser(data.user);
    } finally {
      setBusy(null);
    }
  }

  async function copyReferralCode() {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-saffron bg-gradient-to-br from-paper to-sand text-4xl shadow-[0_0_40px_-8px_rgba(234,88,12,0.6)]">
          {isSubscribed ? "🧙" : "🧘"}
        </div>
        <p className="font-display mt-4 text-xl font-semibold tracking-wide text-ink">{user.name}</p>
        <p className="text-sm text-clay">{user.email}</p>
      </div>

      {(error || message) && (
        <p
          className={`rounded-lg border px-3 py-2 text-xs ${
            error ? "border-red-500/30 bg-red-500/10 text-red-600" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {error ?? message}
        </p>
      )}

      <Card className="p-5">
        <p className="mb-3 text-xs font-bold text-saffron">PREFERRED LANGUAGE</p>
        <ChipSelect
          value={user.preferredLanguage}
          onChange={updateLanguage}
          options={[
            { value: "Hinglish", label: "Hinglish" },
            { value: "Hindi", label: "हिन्दी" },
            { value: "English", label: "English" },
          ]}
        />
      </Card>

      <div>
        <p className="mb-2 text-xs font-bold text-saffron">MY SUBSCRIPTION STATUS</p>
        {isSubscribed ? (
          <Card className="border-2 border-saffron p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-saffron">{user.subscriptionTier}</p>
              <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-600">
                ACTIVE
              </span>
            </div>
            {user.subscriptionExpiry && (
              <p className="mt-2 text-xs text-ink">
                Renews: {new Date(user.subscriptionExpiry).toLocaleDateString()}
              </p>
            )}
            <Button
              variant="destructive"
              className="mt-4 w-full"
              disabled={busy === "/api/profile/cancel-subscription"}
              onClick={() => post("/api/profile/cancel-subscription")}
            >
              Cancel Subscription
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <Card key={tier.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink">
                    {tier.iconSymbol} {tier.name}
                  </p>
                  <p className="font-extrabold text-saffron">
                    ₹{tier.price}/{tier.period}
                  </p>
                </div>
                <p className="mt-1 text-xs text-clay">{tier.description}</p>
                {razorpayConfigured ? (
                  <RazorpayCheckoutButton
                    purpose={{ type: "subscription", tierId: tier.id }}
                    label={`Subscribe - ₹${tier.price}`}
                    size="sm"
                    className="mt-3 w-full"
                    onSuccess={refreshUser}
                  />
                ) : (
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    disabled={busy === "/api/profile/subscribe"}
                    onClick={() => post("/api/profile/subscribe", { tierId: tier.id })}
                  >
                    Subscribe (Demo)
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="border-2 border-saffron/50 p-5">
        <div className="flex items-center justify-between">
          <p className="font-bold text-saffron">🪙 Celestial Wallet</p>
          <p className="text-xl font-extrabold text-saffron">₹{user.walletBalance}.00</p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <code className="rounded-lg bg-cream px-3 py-1.5 text-sm font-bold text-ink">
            {referralCode}
          </code>
          <button
            type="button"
            onClick={copyReferralCode}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron/15 text-saffron hover:bg-saffron/25"
            aria-label="Copy referral code"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <p className="mt-3 text-xs text-clay">
          Share your code. When a friend activates a plan, you get 50% of their plan price credited (one-time demo bonus).
        </p>

        <div className="mt-4 border-t border-clay/15 pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-clay">Recent Activity</p>
          <WalletHistory refreshToken={walletRefreshToken} />
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={user.referralClaimed || busy === "/api/profile/referral"}
            onClick={() => post("/api/profile/referral")}
          >
            Simulate Referral Bonus
          </Button>
          {user.referralClaimed && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy === "/api/profile/referral/reset"}
              onClick={() => post("/api/profile/referral/reset")}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      <div>
        <p className="mb-2 text-xs font-bold text-saffron">RECHARGE WALLET</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CREDITS_PACKS.map((pack) => (
            <Card key={pack.id} className="p-4 text-center">
              <p className="text-2xl">{pack.iconSymbol}</p>
              <p className="mt-1 text-sm font-bold text-ink">{pack.name}</p>
              <p className="text-xs text-clay">+₹{pack.creditsAmount} credits</p>
              {razorpayConfigured ? (
                <RazorpayCheckoutButton
                  purpose={{ type: "credits", packId: pack.id }}
                  label={`₹${pack.price}`}
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onSuccess={refreshUser}
                />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={busy === "/api/profile/credits"}
                  onClick={() => post("/api/profile/credits", { packId: pack.id })}
                >
                  ₹{pack.price}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>

      <CardContent className="p-0 text-center text-[10px] leading-relaxed text-clay/60">
        Disclaimer: Adi Jyotish Gurus provides AI-generated consultations for spiritual guidance and
        entertainment purposes only. This does not constitute licensed financial, legal, or medical advice.
      </CardContent>
    </div>
  );
}
