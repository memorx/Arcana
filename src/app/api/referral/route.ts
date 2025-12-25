import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create referral code
  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      referralCount: true,
      referralCredits: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate referral code if not exists
  if (!user.referralCode) {
    const referralCode = randomBytes(4).toString("hex").toUpperCase();
    user = await prisma.user.update({
      where: { id: session.user.id },
      data: { referralCode },
      select: {
        referralCode: true,
        referralCount: true,
        referralCredits: true,
      },
    });
  }

  return NextResponse.json(user);
}
