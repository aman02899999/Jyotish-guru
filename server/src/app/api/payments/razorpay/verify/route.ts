import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { grantSubscription, grantCredits, grantReportUnlock } from "@/lib/grants";

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid verification request." }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const order = await prisma.paymentOrder.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Idempotent: Checkout's success handler can fire more than once (e.g. a
  // slow network retry) - already-applied orders just report success again
  // without granting anything twice.
  if (order.status === "paid") {
    return NextResponse.json({ success: true, purposeType: order.purposeType });
  }

  const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!isValid) {
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "failed" } });
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { status: "paid", paidAt: new Date(), razorpayPaymentId: razorpay_payment_id },
  });

  switch (order.purposeType) {
    case "subscription":
      await grantSubscription(user.id, order.purposeRef);
      break;
    case "credits":
      await grantCredits(user.id, order.purposeRef);
      break;
    case "report":
      await grantReportUnlock(user.id, order.purposeRef);
      break;
  }

  return NextResponse.json({ success: true, purposeType: order.purposeType });
}
