import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { verifyRazorpaySignature } from "./razorpay-signature";

const ORIGINAL_SECRET = process.env.RAZORPAY_KEY_SECRET;

function sign(orderId: string, paymentId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("verifyRazorpaySignature", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret_value";
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = ORIGINAL_SECRET;
  });

  it("accepts a correctly signed order/payment pair", () => {
    const signature = sign("order_abc123", "pay_xyz789", "test_secret_value");
    expect(verifyRazorpaySignature("order_abc123", "pay_xyz789", signature)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const signature = sign("order_abc123", "pay_xyz789", "wrong_secret");
    expect(verifyRazorpaySignature("order_abc123", "pay_xyz789", signature)).toBe(false);
  });

  it("rejects a signature for a tampered order id", () => {
    const signature = sign("order_abc123", "pay_xyz789", "test_secret_value");
    expect(verifyRazorpaySignature("order_TAMPERED", "pay_xyz789", signature)).toBe(false);
  });

  it("rejects a malformed/short signature without throwing", () => {
    expect(verifyRazorpaySignature("order_abc123", "pay_xyz789", "not-a-real-signature")).toBe(false);
  });

  it("rejects when no server secret is configured", () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    const signature = sign("order_abc123", "pay_xyz789", "test_secret_value");
    expect(verifyRazorpaySignature("order_abc123", "pay_xyz789", signature)).toBe(false);
  });
});
