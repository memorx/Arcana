import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPATIBILITY_COST, getStoredOverall, toIsoDay } from "@/lib/compatibility";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { FadeIn } from "@/components/animations";
import { CompatibilityForm, CompatibilityHistory, MotionSafe } from "@/components/compatibility";

/** Two overlapping circles: the emblem of a reading for two. */
function TwoCircles() {
  return (
    <div aria-hidden="true" className="relative h-14 w-24 shrink-0">
      <span className="absolute left-0 top-0 h-14 w-14 rounded-full border border-purple-400/60 bg-purple-500/20" />
      <span className="absolute right-0 top-0 h-14 w-14 rounded-full border border-amber-400/60 bg-amber-500/20" />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-300">&#10022;</span>
    </div>
  );
}

const linkButton =
  "inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-base font-medium text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default async function CompatibilityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/compatibility");
  }
  const userId = session.user.id;

  const t = await getTranslations("compatibility");
  const locale = await getLocale();

  const [user, profile, readings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { credits: true } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { birthDate: true, fullName: true } }),
    prisma.compatibilityReading.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, partnerName: true, partnerBirthDate: true, summary: true, createdAt: true },
      take: 50,
    }),
  ]);

  const hasProfile = Boolean(profile?.birthDate && profile.fullName?.trim());
  const history = readings.map((r) => ({
    id: r.id,
    partnerName: r.partnerName,
    partnerBirthDate: toIsoDay(r.partnerBirthDate),
    overall: getStoredOverall(r.summary),
    createdAt: r.createdAt.toISOString(),
  }));

  const howItWorks = ["western", "chinese", "numerology", "tonalli", "cards"] as const;

  return (
    <MotionSafe>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <FadeIn>
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <TwoCircles />
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{t("title")}</h1>
              <p className="mt-2 max-w-2xl text-slate-400">{t("subtitle")}</p>
            </div>
          </header>
        </FadeIn>

        {!hasProfile ? (
          <FadeIn delay={0.1}>
            <Card className="border-amber-500/30 bg-amber-900/10">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                <span aria-hidden="true" className="text-4xl text-amber-300">
                  &#9789;
                </span>
                <h2 className="text-xl font-semibold text-slate-100">{t("profileRequired.title")}</h2>
                <p className="max-w-md text-slate-400">{t("profileRequired.description")}</p>
                <Link href="/profile/setup" className={linkButton}>
                  {t("profileRequired.cta")}
                </Link>
              </CardContent>
            </Card>
          </FadeIn>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <FadeIn delay={0.1}>
              <CompatibilityForm credits={user?.credits ?? 0} cost={COMPATIBILITY_COST} />
            </FadeIn>

            <FadeIn delay={0.2}>
              <Card variant="highlighted">
                <CardHeader>
                  <CardTitle className="text-lg">{t("how.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {howItWorks.map((key) => (
                      <li key={key} className="flex gap-3 text-sm text-slate-300">
                        <span aria-hidden="true" className="mt-0.5 text-amber-400">
                          &#10022;
                        </span>
                        <span>{t(`how.${key}`)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        )}

        {/* Previous readings */}
        {(hasProfile || history.length > 0) && (
          <FadeIn delay={0.3}>
            <section className="mt-10" aria-labelledby="previous-readings">
              <h2 id="previous-readings" className="mb-4 text-xl font-semibold text-slate-100">
                {t("previous.title")}
              </h2>
              <CompatibilityHistory readings={history} locale={locale} />
            </section>
          </FadeIn>
        )}
      </div>
    </MotionSafe>
  );
}
