import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionPlanById } from "@/lib/pricing";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 3 attempts per minute
  const { success, resetIn } = rateLimit(req, 3, 60000);
  if (!success) {
    return rateLimitResponse(resetIn);
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId } = body;

    const plan = getSubscriptionPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Check existing subscription
    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (existingSubscription?.status === "active") {
      return NextResponse.json(
        { error: "Already subscribed" },
        { status: 400 }
      );
    }

    // Check profile exists
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile required" },
        { status: 400 }
      );
    }

    // Check user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });

    if (!user || user.credits < plan.creditsCost) {
      return NextResponse.json(
        { error: "Not enough credits", required: plan.creditsCost, available: user?.credits || 0 },
        { status: 400 }
      );
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create subscription and deduct credits in transaction
    await prisma.$transaction(async (tx) => {
      // Deduct credits
      await tx.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: plan.creditsCost } },
      });

      // Create credit transaction
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          amount: -plan.creditsCost,
          type: "SUBSCRIPTION",
        },
      });

      // Create or update subscription
      await tx.subscription.upsert({
        where: { userId: session.user.id },
        update: {
          status: "active",
          paymentMethod: "credits",
          plan: plan.id,
          creditsCostPerMonth: plan.creditsCost,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          freeReadingsPerMonth: plan.freeReadingsPerMonth,
          freeReadingsUsed: 0,
          lastResetDate: now,
          // Clear stripe fields
          stripeSubscriptionId: null,
          stripeCustomerId: null,
        },
        create: {
          userId: session.user.id,
          status: "active",
          paymentMethod: "credits",
          plan: plan.id,
          creditsCostPerMonth: plan.creditsCost,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          freeReadingsPerMonth: plan.freeReadingsPerMonth,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Subscription activated with credits",
      periodEnd: periodEnd.toISOString(),
    });
  } catch (error) {
    console.error("Credits subscription error:", error);
    return NextResponse.json(
      { error: "Error creating subscription" },
      { status: 500 }
    );
  }
}
