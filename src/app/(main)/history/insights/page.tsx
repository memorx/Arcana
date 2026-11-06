import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthStreak, getUserInsights, INSIGHTS_WINDOW_DAYS } from "@/lib/insights";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Glifo } from "@/components/dashboard/Glifos";
import { RETICULA, ROTULO } from "@/components/dashboard/estilos";
import { RecurringCards } from "@/components/insights/RecurringCards";
import { SuitBars } from "@/components/insights/SuitBars";
import { MonthBars } from "@/components/insights/MonthBars";
import { ResonanceSummary } from "@/components/insights/ResonanceSummary";
import { RecapPanel } from "@/components/insights/RecapPanel";

/** Below this, there isn't a story to show yet. */
const MIN_READINGS = 3;

/** One section of the archive: a strong rule on top, the title in Gloock and its subtitle. */
function Section({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0 border-t border-filete pt-6", className)}>
      <div className="mb-6">
        <h2 id={id} className="font-titulo text-2xl leading-tight text-letra sm:text-[1.75rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-1 max-w-[60ch] font-lectura text-letra-suave">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/history/insights");
  }

  const userId = session.user.id;
  const t = await getTranslations("insights");
  const tHistory = await getTranslations("history");
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

  const header = (
    <header className="mb-10 grid justify-items-start gap-3">
      <Link
        href="/history"
        className="inline-flex min-h-11 items-center gap-2 font-dato text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-letra-suave transition-colors hover:text-letra"
      >
        <span aria-hidden="true" className="font-lectura text-base tracking-normal">
          ←
        </span>
        {t("backToHistory")}
      </Link>
      <Etiqueta>{tHistory("etiqueta")}</Etiqueta>
      <h1 className="font-titulo text-[clamp(2.2rem,1.4rem+2.6vw,3.6rem)] leading-[1.05] text-letra">{t("title")}</h1>
      <p className="max-w-[56ch] font-lectura text-lg leading-relaxed text-letra-suave">{t("subtitle")}</p>
    </header>
  );

  // Friendly empty state: fewer than 3 readings
  if (insights.totalReadings < MIN_READINGS) {
    return (
      <div>
        {header}
        <section
          aria-labelledby="insights-vacio"
          className="grid justify-items-start gap-5 border-y border-filete py-10 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10"
        >
          <Glifo nombre="history" className="size-20 text-letra" />
          <div>
            <h2 id="insights-vacio" className="font-titulo text-2xl leading-tight text-letra sm:text-3xl">
              {t("empty.title")}
            </h2>
            <p className="mt-2 max-w-[52ch] font-lectura text-lg text-letra-suave">
              {t("empty.body", { count: insights.totalReadings, required: MIN_READINGS })}
            </p>
            <Link href="/reading/new" className={buttonClasses({ className: "mt-6" })}>
              {t("empty.cta")}
            </Link>
          </div>
        </section>
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
    { label: t("stats.totalReadings"), value: String(insights.totalReadings) },
    { label: t("stats.monthStreak"), value: String(monthStreak) },
    { label: t("stats.reversedRate", { days: INSIGHTS_WINDOW_DAYS }), value: `${insights.reversedRate}%` },
  ];

  return (
    <div>
      {header}

      {/* At a glance */}
      <dl className={cn(RETICULA, "mb-12 grid-cols-3")}>
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 bg-suelo px-1 py-4 sm:px-6 sm:py-5">
            <dt className={ROTULO}>{stat.label}</dt>
            <dd className="mt-2 font-titulo text-[clamp(1.75rem,1.3rem+1.6vw,2.75rem)] leading-none text-letra tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-14">
        <Section
          id="insights-recurring"
          title={t("recurring.title")}
          subtitle={t("recurring.subtitle", { days: INSIGHTS_WINDOW_DAYS })}
        >
          <RecurringCards cards={insights.topCards} />
        </Section>

        <div className="grid gap-14 lg:grid-cols-2 lg:gap-12">
          <Section
            id="insights-suits"
            title={t("suits.title")}
            subtitle={t("suits.subtitle", { days: INSIGHTS_WINDOW_DAYS })}
          >
            <SuitBars suits={insights.suits} />
          </Section>

          <Section id="insights-months" title={t("months.title")} subtitle={t("months.streak", { count: monthStreak })}>
            <MonthBars months={insights.byMonth} />
          </Section>
        </div>

        <Section id="insights-resonance" title={t("resonance.title")}>
          <ResonanceSummary resonance={insights.resonance} />
        </Section>

        <Section id="insights-recap" title={t("recap.title")} subtitle={t("recap.subtitle")}>
          <RecapPanel months={recapMonths} initialRecaps={recaps} />
        </Section>
      </div>
    </div>
  );
}
