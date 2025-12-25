import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubscriptionPlanById } from "@/lib/pricing";

// Runs daily at midnight to check for expiring credit subscriptions
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  console.log(`[CRON RENEW] Auth header present: ${!!authHeader}`);

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Find credit subscriptions expiring in next 24 hours
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        paymentMethod: "credits",
        status: "active",
        currentPeriodEnd: {
          lte: tomorrow,
        },
        cancelAtPeriodEnd: false,
      },
      include: {
        user: {
          select: { id: true, credits: true, email: true },
        },
      },
    });

    console.log(`[CRON RENEW] Found ${expiringSubscriptions.length} credit subscriptions to renew`);

    let renewed = 0;
    let failed = 0;

    for (const sub of expiringSubscriptions) {
      const plan = getSubscriptionPlanById(sub.plan);
      const creditsCost = plan?.creditsCost || sub.creditsCostPerMonth;

      const hasEnoughCredits = sub.user.credits >= creditsCost;

      if (hasEnoughCredits) {
        // Renew subscription
        const newPeriodEnd = new Date(sub.currentPeriodEnd!);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: sub.userId },
            data: { credits: { decrement: creditsCost } },
          });

          await tx.creditTransaction.create({
            data: {
              userId: sub.userId,
              amount: -creditsCost,
              type: "PURCHASE",
            },
          });

          await tx.subscription.update({
            where: { id: sub.id },
            data: {
              currentPeriodStart: sub.currentPeriodEnd,
              currentPeriodEnd: newPeriodEnd,
              freeReadingsUsed: 0,
              lastResetDate: new Date(),
            },
          });
        });

        console.log(`[CRON RENEW] Renewed subscription for ${sub.user.email}`);
        renewed++;
      } else {
        // Mark as credits_exhausted
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "credits_exhausted" },
        });

        console.log(`[CRON RENEW] Subscription expired for ${sub.user.email} - not enough credits`);
        failed++;

        // TODO: Send email notification about expired subscription
      }
    }

    return NextResponse.json({
      success: true,
      checked: expiringSubscriptions.length,
      renewed,
      expired: failed,
    });
  } catch (error) {
    console.error("[CRON RENEW] Renewal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
