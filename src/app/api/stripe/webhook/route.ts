import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || "0", 10);

    if (!userId || !credits) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Add credits to user
        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: credits } },
        });

        // Create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: credits,
            type: "PURCHASE",
            stripeSessionId: session.id,
          },
        });
      });

      console.log(`Added ${credits} credits to user ${userId}`);
    } catch (error) {
      console.error("Error processing checkout:", error);
      return NextResponse.json(
        { error: "Error processing checkout" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
