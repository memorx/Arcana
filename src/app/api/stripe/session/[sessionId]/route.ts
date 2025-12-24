import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify this session belongs to the current user
    if (checkoutSession.metadata?.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Sesion no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: checkoutSession.status,
      paymentStatus: checkoutSession.payment_status,
      credits: parseInt(checkoutSession.metadata?.credits || "0", 10),
      amountTotal: checkoutSession.amount_total,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Error al obtener sesion" },
      { status: 500 }
    );
  }
}
