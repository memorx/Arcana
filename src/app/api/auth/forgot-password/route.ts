import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists with this email and has a password (not OAuth-only)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing reset tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: email.toLowerCase() },
    });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Create the reset token
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token,
        expires,
      },
    });

    // In production, you would send an email here
    // For now, log the reset link (development only)
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    if (process.env.NODE_ENV === "development") {
      console.log("Password reset link:", resetUrl);
    }

    // TODO: Send email with reset link using a service like Resend, SendGrid, etc.
    // Example:
    // await sendEmail({
    //   to: email,
    //   subject: "Reset your password",
    //   html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
