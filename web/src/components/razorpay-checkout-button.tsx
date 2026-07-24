"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

type Purpose =
  | { type: "subscription"; tierId: string }
  | { type: "credits"; packId: string }
  | { type: "report"; sessionId: string };

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load the Razorpay checkout script."));
      document.body.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

export function RazorpayCheckoutButton({
  purpose,
  label,
  className,
  variant,
  size,
  disabled,
  onSuccess,
}: {
  purpose: Purpose;
  label: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsProcessing(true);
    try {
      const orderResponse = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        setError(orderData.error ?? "Could not start checkout.");
        setIsProcessing(false);
        return;
      }

      await loadRazorpayScript();
      if (!window.Razorpay) {
        setError("Could not load the payment widget. Please try again.");
        setIsProcessing(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.orderId,
        prefill: orderData.prefill,
        theme: { color: "#EA580C" },
        handler: (response) => {
          void (async () => {
            try {
              const verifyResponse = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              const verifyData = await verifyResponse.json();
              if (!verifyResponse.ok) {
                setError(verifyData.error ?? "Payment could not be verified. If money was deducted, please contact support.");
                return;
              }
              onSuccess?.();
            } catch {
              setError("Payment succeeded but verification failed. If money was deducted, please contact support.");
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });
      razorpay.open();
    } catch {
      setError("Could not start checkout. Please try again.");
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isProcessing}
        onClick={handleClick}
      >
        {isProcessing ? "Processing..." : label}
      </Button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
