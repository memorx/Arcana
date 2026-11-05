import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCompatibilitySummary } from "@/lib/compatibility";
import type { Locale } from "@/lib/systems";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { FadeIn } from "@/components/animations";
import { CompatibilityCards, CompatibilityMeters, MotionSafe, ReadingText } from "@/components/compatibility";

interface PageProps {
  params: Promise<{ id: string }>;
}

const firstWord = (s: string | null | undefined) => s?.trim().split(/\s+/)[0] || null;

const linkButton =
  "inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-base font-medium text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default async function CompatibilityReadingPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/compatibility/${id}`);
  }
  const userId = session.user.id;

  const t = await getTranslations("compatibility");
  const locale: Locale = (await getLocale()) === "en" ? "en" : "es";

  const [reading, profile, user] = await Promise.all([
    prisma.compatibilityReading.findUnique({ where: { id } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { fullName: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  // Only the owner can see it; for anyone else it doesn't exist.
  if (!reading || reading.userId !== userId) {
    notFound();
  }

  const summary = parseCompatibilitySummary(reading.summary);
  const myName = firstWord(profile?.fullName) ?? firstWord(user?.name) ?? t("roles.me");
  const partnerName = reading.partnerName || t("roles.partner");
  const createdOn = reading.createdAt.toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <MotionSafe>
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <FadeIn>
          <header className="mb-8">
            <Link
              href="/compatibility"
              className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("detail.back")}
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge variant="primary">{t("title")}</Badge>
              <span className="text-sm text-slate-500">{t("detail.createdOn", { date: createdOn })}</span>
            </div>
            <h1 className="mt-3 break-words text-3xl font-bold text-slate-100">
              {t("detail.title", { me: myName, partner: partnerName })}
            </h1>
            {summary && (
              <p className="mt-2 text-amber-200/90">{summary.systems.overallLabel[locale]}</p>
            )}
          </header>
        </FadeIn>

        {summary ? (
          <>
            {/* Five meters */}
            <FadeIn delay={0.1}>
              <section className="mb-10" aria-labelledby="meters-title">
                <h2 id="meters-title" className="mb-4 text-xl font-semibold text-slate-100">
                  {t("detail.metersTitle")}
                </h2>
                <CompatibilityMeters systems={summary.systems} locale={locale} />
              </section>
            </FadeIn>

            {/* Three cards */}
            <FadeIn delay={0.2}>
              <section className="mb-10" aria-labelledby="cards-title">
                <h2 id="cards-title" className="mb-6 text-xl font-semibold text-slate-100">
                  {t("detail.cardsTitle")}
                </h2>
                <CompatibilityCards cards={summary.cards} partnerName={reading.partnerName} locale={locale} />
              </section>
            </FadeIn>
          </>
        ) : (
          <p className="mb-8 text-sm text-slate-500">{t("detail.summaryUnavailable")}</p>
        )}

        {/* The reading */}
        <FadeIn delay={0.3}>
          <Card variant="highlighted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span aria-hidden="true" className="text-amber-400">
                  &#9788;
                </span>
                {t("detail.readingTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReadingText content={reading.content} />
            </CardContent>
          </Card>
        </FadeIn>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Link href="/compatibility" className={linkButton}>
            {t("detail.newReading")}
          </Link>
        </div>
      </div>
    </MotionSafe>
  );
}
