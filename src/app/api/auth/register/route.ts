import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, referralCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    // Check if referral code is valid
    let referrer = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        referredBy: referrer?.referralCode || null,
      },
    });

    // If referred, reward both users
    if (referrer) {
      await prisma.$transaction([
        // Give referrer 2 credits
        prisma.user.update({
          where: { id: referrer.id },
          data: {
            credits: { increment: 2 },
            referralCredits: { increment: 2 },
            referralCount: { increment: 1 },
          },
        }),
        // Create transaction for referrer
        prisma.creditTransaction.create({
          data: {
            userId: referrer.id,
            amount: 2,
            type: "REFERRAL",
          },
        }),
        // Give new user 1 bonus credit
        prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: 1 } },
        }),
        // Create transaction for new user
        prisma.creditTransaction.create({
          data: {
            userId: user.id,
            amount: 1,
            type: "BONUS",
          },
        }),
      ]);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
