import crypto from "node:crypto";

/**
 * Verifies the signature Razorpay Checkout returns after a successful
 * payment: HMAC-SHA256 of "{order_id}|{payment_id}" using the key secret,
 * exactly as documented at
 * https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#verify-payment-signature
 *
 * Deliberately not marked server-only: it's pure crypto with no side
 * effects (and reads the secret from env at call time rather than holding
 * it), which keeps it importable from a plain Vitest/Node test without
 * server-only's bundler-condition check getting in the way.
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
