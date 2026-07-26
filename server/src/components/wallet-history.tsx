"use client";

import { useEffect, useState } from "react";

interface WalletTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  credit_purchase: "💳",
  referral_bonus: "🎁",
  report_payment: "🔮",
};

export function WalletHistory({ refreshToken }: { refreshToken: number }) {
  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/wallet-transactions")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setTransactions(data.transactions ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  if (transactions === null) {
    return <p className="text-xs text-clay">Loading transaction history...</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-xs text-clay">No wallet activity yet.</p>;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-clay/15 bg-cream/60 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-base">{TYPE_ICON[t.type] ?? "🪙"}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink">{t.description}</p>
              <p className="text-[10px] text-clay">{new Date(t.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-xs font-bold ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {t.amount >= 0 ? "+" : ""}₹{t.amount}
            </p>
            <p className="text-[10px] text-clay">Bal ₹{t.balanceAfter}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
