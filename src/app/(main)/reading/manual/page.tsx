import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManualReadingFlow, type ManualSpread } from "@/components/manual/ManualReadingFlow";
import type { ManualSpreadPosition } from "@/components/manual/SlotList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("manual");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

/**
 * /reading/manual — reading with your own physical deck. The spreads and the
 * balance come from the server; the 78 cards are fetched by the client flow
 * from GET /api/cards.
 */
export default async function ManualReadingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/reading/manual");
  }

  const locale = await getLocale();

  const [user, spreadTypes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { freeReadingsLeft: true, credits: true },
    }),
    prisma.spreadType.findMany({
      orderBy: { cardCount: "asc" },
    }),
  ]);

  const spreads: ManualSpread[] = spreadTypes.map((spread) => ({
    id: spread.id,
    name: spread.name,
    nameEs: spread.nameEs,
    description: spread.description,
    descriptionEs: spread.descriptionEs,
    cardCount: spread.cardCount,
    creditCost: spread.creditCost,
    category: spread.category,
    positions: (Array.isArray(spread.positions) ? spread.positions : []) as unknown as ManualSpreadPosition[],
  }));

  return (
    <ManualReadingFlow
      spreadTypes={spreads}
      freeReadingsLeft={user?.freeReadingsLeft ?? 0}
      credits={user?.credits ?? 0}
      locale={locale}
    />
  );
}
