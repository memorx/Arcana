import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getSubscriptionPlanById } from "@/lib/pricing";

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

  try {
    switch (event.type) {
      // =========================================================================
      // CREDIT PURCHASES
      // =========================================================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle credit purchases (not subscriptions)
        if (session.mode === "payment") {
          const userId = session.metadata?.userId;
          const credits = parseInt(session.metadata?.credits || "0", 10);

          if (!userId || !credits) {
            console.error("Missing metadata in checkout session:", session.id);
            break;
          }

          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: userId },
              data: { credits: { increment: credits } },
            });

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
        }
        break;
      }

      // =========================================================================
      // SUBSCRIPTION EVENTS
      // =========================================================================
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const planId = subscription.metadata?.planId;

        if (!userId) {
          console.error("Missing userId in subscription metadata");
          break;
        }

        const plan = getSubscriptionPlanById(planId || "daily_oracle");

        // Access period dates safely (they exist on the raw object)
        const subData = subscription as unknown as {
          current_period_start: number;
          current_period_end: number;
        };

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status === "active" ? "active" : "past_due",
            plan: planId || "daily_oracle",
            currentPeriodStart: new Date(subData.current_period_start * 1000),
            currentPeriodEnd: new Date(subData.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            freeReadingsPerMonth: plan?.freeReadingsPerMonth || 1,
            freeReadingsUsed: 0,
            lastResetDate: new Date(),
          },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: subscription.status === "active" ? "active" : "past_due",
            plan: planId || "daily_oracle",
            currentPeriodStart: new Date(subData.current_period_start * 1000),
            currentPeriodEnd: new Date(subData.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            freeReadingsPerMonth: plan?.freeReadingsPerMonth || 1,
            freeReadingsUsed: 0,
            lastResetDate: new Date(),
          },
        });

        console.log(`Subscription created for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find subscription by Stripe ID
        const existingSub = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!existingSub) {
          console.error("Subscription not found:", subscription.id);
          break;
        }

        // Access period dates safely
        const subData = subscription as unknown as {
          current_period_start: number;
          current_period_end: number;
        };

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status === "active" ? "active" :
                   subscription.status === "past_due" ? "past_due" : "canceled",
            currentPeriodStart: new Date(subData.current_period_start * 1000),
            currentPeriodEnd: new Date(subData.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        console.log(`Subscription updated: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "canceled" },
        });

        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // Access subscription field safely (it exists on the raw object)
        const invoiceData = invoice as unknown as { subscription: string | { id: string } | null };

        // Only process subscription invoices (not one-time payments)
        if (!invoiceData.subscription) break;

        const subscriptionId = typeof invoiceData.subscription === "string"
          ? invoiceData.subscription
          : invoiceData.subscription.id;

        // Check if this is a renewal (not the first payment)
        if (invoice.billing_reason === "subscription_cycle") {
          // Reset free readings for the new billing period
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              freeReadingsUsed: 0,
              lastResetDate: new Date(),
              status: "active",
            },
          });

          console.log(`Reset free readings for subscription: ${subscriptionId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // Access subscription field safely (it exists on the raw object)
        const invoiceData = invoice as unknown as { subscription: string | { id: string } | null };

        if (!invoiceData.subscription) break;

        const subscriptionId = typeof invoiceData.subscription === "string"
          ? invoiceData.subscription
          : invoiceData.subscription.id;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: "past_due" },
        });

        console.log(`Payment failed for subscription: ${subscriptionId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
