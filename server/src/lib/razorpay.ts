import "server-only";
import Razorpay from "razorpay";

export { verifyRazorpaySignature } from "@/lib/razorpay-signature";

export const isRazorpayConfigured = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
);

let cachedClient: Razorpay | null = null;

function getClient(): Razorpay {
  if (!isRazorpayConfigured) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET missing).");
  }
  if (!cachedClient) {
    cachedClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return cachedClient;
}

export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
  notes: Record<string, string>
) {
  const razorpay = getClient();
  return razorpay.orders.create({
    amount: Math.round(amountRupees * 100), // Razorpay wants the smallest currency unit (paise)
    currency: "INR",
    receipt,
    notes,
  });
}
