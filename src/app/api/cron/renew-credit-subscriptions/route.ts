import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubscriptionPlanById } from "@/lib/pricing";
import { sendSubscriptionExpiredEmail } from "@/lib/email";
import { verifyCronRequest } from "@/lib/cron-auth";
import { InsufficientCreditsError, spendCredits } from "@/lib/credits";

export const maxDuration = 60;

// Runs daily at midnight to check for expiring credit subscriptions
export async function GET(req: NextRequest) {
  console.log(`[CRON RENEW] Auth header present: ${!!req.headers.get("authorization")}`);

  const unauthorized = verifyCronRequest(req);
  if (unauthorized) {
    return unauthorized;
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
          // Prisma rejects `select` and `include` side by side, so the profile is selected too
          select: {
            id: true,
            credits: true,
            email: true,
            name: true,
            profile: { select: { fullName: true, locale: true } },
          },
        },
      },
    });

    console.log(`[CRON RENEW] Found ${expiringSubscriptions.length} credit subscriptions to renew`);

    let renewed = 0;
    let failed = 0;
    let skipped = 0;

    for (const sub of expiringSubscriptions) {
      const plan = getSubscriptionPlanById(sub.plan);
      const creditsCost = plan?.creditsCost || sub.creditsCostPerMonth;

      let outcome: "renewed" | "already_renewed" | "insufficient" = "insufficient";

      if (sub.user.credits >= creditsCost) {
        // Renew subscription
        const newPeriodEnd = new Date(sub.currentPeriodEnd!);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        try {
          outcome = await prisma.$transaction(async (tx) => {
            // Claim this period: only one run can move currentPeriodEnd forward.
            // A retried or concurrent run finds count === 0 and charges nothing.
            const claimed = await tx.subscription.updateMany({
              where: {
                id: sub.id,
                currentPeriodEnd: sub.currentPeriodEnd,
                status: "active",
              },
              data: {
                currentPeriodStart: sub.currentPeriodEnd,
                currentPeriodEnd: newPeriodEnd,
                freeReadingsUsed: 0,
                lastResetDate: new Date(),
              },
            });

            if (claimed.count === 0) {
              return "already_renewed" as const;
            }

            const paid = await spendCredits(tx, sub.userId, creditsCost, "SUBSCRIPTION");
            if (!paid) {
              // Balance changed since we read it: roll back the period change too
              throw new InsufficientCreditsError();
            }

            return "renewed" as const;
          });
        } catch (error) {
          if (!(error instanceof InsufficientCreditsError)) {
            throw error;
          }
          outcome = "insufficient";
        }
      }

      if (outcome === "renewed") {
        console.log(`[CRON RENEW] Renewed subscription for ${sub.user.email}`);
        renewed++;
        continue;
      }

      if (outcome === "already_renewed") {
        console.log(`[CRON RENEW] Subscription for ${sub.user.email} was already renewed for this period`);
        skipped++;
        continue;
      }

      // Mark as credits_exhausted (only once, even if two runs overlap)
      const exhausted = await prisma.subscription.updateMany({
        where: { id: sub.id, status: "active", currentPeriodEnd: sub.currentPeriodEnd },
        data: { status: "credits_exhausted" },
      });

      if (exhausted.count === 0) {
        skipped++;
        continue;
      }

      console.log(`[CRON RENEW] Subscription expired for ${sub.user.email} - not enough credits`);
      failed++;

      // Send email notification about expired subscription
      const userName = sub.user.profile?.fullName?.split(" ")[0] || sub.user.name || "there";
      const locale = sub.user.profile?.locale || "es";

      try {
        await sendSubscriptionExpiredEmail({
          to: sub.user.email,
          userName,
          locale,
        });
        console.log(`[CRON RENEW] Sent expiration email to ${sub.user.email}`);
      } catch (emailError) {
        console.error(`[CRON RENEW] Failed to send expiration email to ${sub.user.email}:`, emailError);
      }
    }

    return NextResponse.json({
      success: true,
      checked: expiringSubscriptions.length,
      renewed,
      expired: failed,
      skipped,
    });
  } catch (error) {
    console.error("[CRON RENEW] Renewal error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
