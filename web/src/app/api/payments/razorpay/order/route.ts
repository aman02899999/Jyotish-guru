import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/razorpay";
import { resolvePurpose, type PaymentPurpose } from "@/lib/payment-purpose";

const purposeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("subscription"), tierId: z.string() }),
  z.object({ type: z.literal("credits"), packId: z.string() }),
  z.object({ type: z.literal("report"), sessionId: z.string() }),
]);

const requestSchema = z.object({ purpose: purposeSchema });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isRazorpayConfigured) {
    return NextResponse.json({ error: "Payments are not configured on this server." }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }
  const purpose = parsed.data.purpose as PaymentPurpose;

  const resolved = await resolvePurpose(purpose, user);
  if (!resolved) {
    return NextResponse.json({ error: "This item can't be purchased right now." }, { status: 400 });
  }

  // Razorpay receipts are capped at 40 characters.
  const receipt = `${purpose.type}_${user.id}_${Date.now()}`.slice(0, 40);

  let order;
  try {
    order = await createRazorpayOrder(resolved.amount, receipt, {
      userId: user.id,
      purposeType: purpose.type,
      purposeRef: resolved.ref,
    });
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return NextResponse.json({ error: "Could not start the payment. Please try again." }, { status: 502 });
  }

  await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      razorpayOrderId: order.id,
      purposeType: purpose.type,
      purposeRef: resolved.ref,
      amount: resolved.amount,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    amount: resolved.amount,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    name: "Adi Jyotish Gurus",
    description: resolved.description,
    prefill: { name: user.name, email: user.email },
  });
}
