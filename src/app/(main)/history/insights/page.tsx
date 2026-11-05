import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthStreak, getUserInsights, INSIGHTS_WINDOW_DAYS } from "@/lib/insights";
import { Button, Card, CardContent } from "@/components/ui";
import { FadeIn } from "@/components/animations";
import { InsightsMotion } from "@/components/insights/InsightsMotion";
import { RecurringCards } from "@/components/insights/RecurringCards";
import { SuitBars } from "@/components/insights/SuitBars";
import { MonthBars } from "@/components/insights/MonthBars";
import { ResonanceSummary } from "@/components/insights/ResonanceSummary";
import { RecapPanel } from "@/components/insights/RecapPanel";

/** Below this, there isn't a story to show yet. */
const MIN_READINGS = 3;

function Section({
  id,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <FadeIn delay={delay} duration={0.4}>
      <section aria-labelledby={id}>
        <Card className="h-full">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 id={id} className="text-xl font-semibold text-slate-100">
                {title}
              </h2>
              {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
            </div>
            {children}
          </CardContent>
        </Card>
      </section>
    </FadeIn>
  );
}

export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/history/insights");
  }

  const userId = session.user.id;
  const t = await getTranslations("insights");
  const locale = await getLocale();
  const intlLocale = locale === "en" ? "en-US" : "es-ES";

  const [insights, recaps] = await Promise.all([
    getUserInsights(userId),
    prisma.monthlyRecap.findMany({
      where: { userId },
      select: { year: true, month: true, content: true, readingCount: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    }),
  ]);

  const backLink = (
    <Link
      href="/history"
      className="text-slate-400 hover:text-slate-300 text-sm inline-flex items-center gap-1"
    >
      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {t("backToHistory")}
    </Link>
  );

  const header = (
    <header className="mb-8">
      {backLink}
      <h1 className="text-3xl font-bold text-slate-100 mt-3">{t("title")}</h1>
      <p className="text-slate-400 mt-1">{t("subtitle")}</p>
    </header>
  );

  // Friendly empty state: fewer than 3 readings
  if (insights.totalReadings < MIN_READINGS) {
    return (
      <div className="max-w-4xl mx-auto">
        {header}
        <Card variant="highlighted">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="text-5xl text-amber-400/60 mb-4" aria-hidden="true">
              &#10022;
            </div>
            <h2 className="text-xl font-semibold text-slate-100 mb-2">{t("empty.title")}</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              {t("empty.body", { count: insights.totalReadings, required: MIN_READINGS })}
            </p>
            <Link href="/reading/new">
              <Button>{t("empty.cta")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthStreak = getMonthStreak(insights.byMonth);
  const monthLabel = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" });
  const recapMonths = insights.byMonth.map((m) => {
    const label = monthLabel.format(new Date(Date.UTC(m.year, m.month - 1, 1)));
    // "Noviembre de 2026", not "Noviembre De 2026"
    return { ...m, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  const stats = [
    { label: t("stats.totalReadings"), value: String(insights.totalReadings), color: "text-purple-300" },
    { label: t("stats.monthStreak"), value: String(monthStreak), color: "text-amber-300" },
    {
      label: t("stats.reversedRate", { days: INSIGHTS_WINDOW_DAYS }),
      value: `${insights.reversedRate}%`,
      color: "text-orange-300",
    },
  ];

  return (
    <InsightsMotion>
      <div className="max-w-4xl mx-auto">
        {header}

        {/* At a glance */}
        <FadeIn duration={0.4}>
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-3 sm:p-5">
                  <p className="text-xs sm:text-sm text-slate-400 leading-tight">{stat.label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold tabular-nums mt-1 ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </FadeIn>

        <div className="space-y-6">
          <Section
            id="insights-recurring"
            title={t("recurring.title")}
            subtitle={t("recurring.subtitle", { days: INSIGHTS_WINDOW_DAYS })}
            delay={0.05}
          >
            <RecurringCards cards={insights.topCards} />
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              id="insights-suits"
              title={t("suits.title")}
              subtitle={t("suits.subtitle", { days: INSIGHTS_WINDOW_DAYS })}
              delay={0.1}
            >
              <SuitBars suits={insights.suits} />
            </Section>

            <Section
              id="insights-months"
              title={t("months.title")}
              subtitle={t("months.streak", { count: monthStreak })}
              delay={0.15}
            >
              <MonthBars months={insights.byMonth} />
            </Section>
          </div>

          <Section id="insights-resonance" title={t("resonance.title")} delay={0.2}>
            <ResonanceSummary resonance={insights.resonance} />
          </Section>

          <Section id="insights-recap" title={t("recap.title")} subtitle={t("recap.subtitle")} delay={0.25}>
            <RecapPanel months={recapMonths} initialRecaps={recaps} />
          </Section>
        </div>
      </div>
    </InsightsMotion>
  );
}
