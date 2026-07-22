"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReportSession } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Paywall({ session, walletBalance }: { session: ReportSession; walletBalance: number }) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(endpoint: "pay" | "mock-pay") {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${session.id}/${endpoint}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Payment failed.");
        setIsProcessing(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setIsProcessing(false);
    }
  }

  const hasEnoughBalance = walletBalance >= session.price;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Report Generated!</CardTitle>
          <span className="text-xl">🔒</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 blur-sm select-none" aria-hidden>
            <p className="text-sm text-galactic-white">
              Lagna Lord is strongly placed in the 10th House, signifying massive professional expansion.
            </p>
            <p className="text-sm text-galactic-white">
              Rahu&apos;s alignment with the 9th lord brings unexpected settlement and travels abroad.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-celestial-gold/50 p-6 text-center">
        <p className="text-lg font-extrabold text-celestial-gold">Unlock Your Complete Consultation</p>
        <p className="mt-1 text-xs text-space-lavender">Consultation with {session.astrologerName}</p>

        <p className="mt-6 text-xs text-space-lavender">Total Session Price</p>
        <p className="text-4xl font-black text-celestial-gold">₹{session.price}</p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <div className="rounded-xl border border-celestial-gold/30 bg-soft-plum p-4 text-left">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-celestial-gold">🪙 Celestial Wallet</p>
              <p className="text-xs font-bold text-celestial-gold">Balance: ₹{walletBalance}</p>
            </div>
            <Button
              className="mt-3 w-full"
              disabled={!hasEnoughBalance || isProcessing}
              onClick={() => pay("pay")}
            >
              {hasEnoughBalance ? `Pay ₹${session.price} With Wallet` : "Insufficient Balance"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-space-lavender/15" />
            <span className="text-[10px] font-bold text-space-lavender/60">OR</span>
            <div className="h-px flex-1 bg-space-lavender/15" />
          </div>

          <Button variant="outline" className="w-full" disabled={isProcessing} onClick={() => pay("mock-pay")}>
            {isProcessing ? "Processing..." : "Simulate Card / UPI Payment"}
          </Button>
          <p className="text-[10px] text-space-lavender/60">
            Sandbox mode - this is a demo checkout, no real payment is charged.
          </p>
        </div>
      </Card>

      <Card className="p-5 text-center">
        <p className="text-xs font-bold text-celestial-gold">Unlock consultations instantly with a subscription</p>
        <Link href="/profile" className="mt-2 inline-block text-xs font-bold text-astral-rose hover:underline">
          View subscription plans →
        </Link>
      </Card>
    </div>
  );
}
