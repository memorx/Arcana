import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCardOfTheMonth } from "@/lib/insights";
import { Button, Card, CardContent, TarotCardStatic } from "@/components/ui";

interface InsightsWidgetProps {
  userId: string;
}

/** Dashboard: the card that came up most this month, with a link to "Mi historia". */
export async function InsightsWidget({ userId }: InsightsWidgetProps) {
  const t = await getTranslations("insights.widget");
  const locale = await getLocale();

  let data: Awaited<ReturnType<typeof getCardOfTheMonth>>;
  let totalReadings = 0;
  try {
    data = await getCardOfTheMonth(userId);
    if (!data.card) {
      totalReadings = await prisma.reading.count({ where: { userId } });
    }
  } catch (error) {
    // A widget must never take the dashboard down.
    console.error("Error loading insights widget:", error);
    return null;
  }

  const { card } = data;

  // No readings at all: a short invitation
  if (!card && totalReadings === 0) {
    return (
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-slate-900/50">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl text-amber-400/70" aria-hidden="true">
              &#10022;
            </span>
            <div>
              <p className="font-medium text-slate-100">{t("emptyTitle")}</p>
              <p className="text-sm text-slate-400">{t("emptyBody")}</p>
            </div>
          </div>
          <Link href="/reading/new" className="self-start sm:self-auto">
            <Button size="sm">{t("emptyCta")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Readings, but none this month yet
  if (!card) {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-purple-300 font-medium">{t("title")}</p>
            <p className="text-slate-300 mt-0.5">{t("noReadingsMonth")}</p>
          </div>
          <Link href="/history/insights" className="self-start sm:self-auto">
            <Button variant="secondary" size="sm">
              {t("viewStory")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const name = locale === "en" ? card.name : card.nameEs;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-r from-purple-900/30 to-amber-900/20">
      <CardContent className="p-4 flex items-center gap-4">
        <TarotCardStatic
          card={{
            name: card.name,
            nameEs: card.nameEs,
            arcana: card.arcana,
            suit: card.suit,
            number: card.number,
            imageUrl: card.imageUrl,
          }}
          size="sm"
          showReversedBadge={false}
          locale={locale}
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-purple-300 font-medium">{t("title")}</p>
          <p className="text-lg font-semibold text-slate-100 truncate">{name}</p>
          <p className="text-sm text-amber-300 tabular-nums">{t("count", { count: card.count })}</p>
          <Link
            href="/history/insights"
            className="inline-flex items-center gap-1 mt-2 text-sm text-slate-300 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
          >
            {t("viewStory")}
            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
