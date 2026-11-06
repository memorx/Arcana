import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCompatibilitySummary } from "@/lib/compatibility";
import type { Locale } from "@/lib/systems";
import { Badge } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Reveal } from "@/components/blueprint/Reveal";
import { ENLACE_DATO, enlaceBoton } from "@/components/blueprint/link-styles";
import { CompatibilityCards } from "@/components/compatibility/CompatibilityCards";
import { CompatibilityMeters } from "@/components/compatibility/CompatibilityMeters";
import { ReadingText } from "@/components/compatibility/ReadingText";

interface PageProps {
  params: Promise<{ id: string }>;
}

const firstWord = (s: string | null | undefined) => s?.trim().split(/\s+/)[0] || null;

/** Section title of the sheet (h2). */
const TITULO = "text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]";

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
    <div className="grid gap-12 sm:gap-14">
      {/* Header */}
      <Reveal>
        <header className="grid justify-items-start gap-4 border-b border-filete pb-8">
          <Link href="/compatibility" className={ENLACE_DATO}>
            <span aria-hidden="true" className="font-lectura text-base tracking-normal">
              ←
            </span>
            {t("detail.back")}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge variant="primary">{t("title")}</Badge>
            <span className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.08em] text-letra-suave uppercase">
              {t("detail.createdOn", { date: createdOn })}
            </span>
          </div>
          <h1 className="max-w-full text-[clamp(2.2rem,1.4rem+2.8vw,3.75rem)] leading-[1.02] break-words">
            {t("detail.title", { me: myName, partner: partnerName })}
          </h1>
          {summary && (
            <p className="max-w-[52ch] text-[clamp(1.15rem,1rem+0.5vw,1.4rem)] leading-[1.45] italic">
              {summary.systems.overallLabel[locale]}
            </p>
          )}
        </header>
      </Reveal>

      {summary ? (
        <>
          {/* Five meters */}
          <Reveal delay={80}>
            <section aria-labelledby="meters-title">
              <h2 id="meters-title" className={`mb-5 ${TITULO}`}>
                {t("detail.metersTitle")}
              </h2>
              <CompatibilityMeters systems={summary.systems} locale={locale} />
            </section>
          </Reveal>

          {/* Three cards */}
          <Reveal delay={160}>
            <section aria-labelledby="cards-title">
              <h2 id="cards-title" className={`mb-6 ${TITULO}`}>
                {t("detail.cardsTitle")}
              </h2>
              <CompatibilityCards cards={summary.cards} partnerName={reading.partnerName} locale={locale} />
            </section>
          </Reveal>
        </>
      ) : (
        <p className="border-l-2 border-rosa pl-4 text-[1.0625rem] leading-[1.6] text-letra-suave">
          {t("detail.summaryUnavailable")}
        </p>
      )}

      {/* The reading, as a printed sheet */}
      <Reveal delay={240}>
        <section
          aria-labelledby="reading-title"
          className="grid gap-8 border-t border-filete pt-8 sm:pt-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14"
        >
          <header className="grid content-start gap-3">
            <Etiqueta>{t("detail.readingEyebrow")}</Etiqueta>
            <h2 id="reading-title" className={TITULO}>
              {t("detail.readingTitle")}
            </h2>
          </header>
          <ReadingText content={reading.content} />
        </section>
      </Reveal>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3 border-t border-filete/25 pt-8">
        <Link href="/compatibility" className={enlaceBoton({ size: "lg" })}>
          {t("detail.newReading")}
        </Link>
      </div>
    </div>
  );
}
