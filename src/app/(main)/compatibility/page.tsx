import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPATIBILITY_COST, getStoredOverall, toIsoDay } from "@/lib/compatibility";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Reveal } from "@/components/blueprint/Reveal";
import { buttonClasses } from "@/components/ui/button-classes";
import { CompatibilityForm } from "@/components/compatibility/CompatibilityForm";
import { CompatibilityHistory } from "@/components/compatibility/CompatibilityHistory";

/** The «Lectura de dos» glyph of the home page: two circles in ink, the shared part in pink. */
function TwoCircles() {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 44" className="order-first size-16 shrink-0 text-letra sm:order-none sm:size-24">
      <circle cx="16" cy="22" r="11" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="28" cy="22" r="11" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <path d="M22 12.8a11 11 0 0 1 0 18.4a11 11 0 0 1 0-18.4z" className="fill-rosa" />
    </svg>
  );
}

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
  const ROMANOS = ["I", "II", "III", "IV", "V"];

  return (
    <div className="grid gap-12 sm:gap-14">
      {/* Header */}
      <Reveal>
        <header className="grid items-end gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10">
          <div className="grid min-w-0 gap-3">
            <Etiqueta>{t("eyebrow")}</Etiqueta>
            <h1 className="text-[clamp(2.2rem,1.4rem+2.8vw,3.75rem)] leading-[1.02]">{t("title")}</h1>
            <p className="max-w-[52ch] text-[1.125rem] leading-[1.6] text-letra-suave">{t("subtitle")}</p>
          </div>
          <TwoCircles />
        </header>
      </Reveal>

      {!hasProfile ? (
        <Reveal delay={80}>
          <section
            aria-labelledby="compatibility-profile-required"
            data-estado="sin-perfil"
            className="grid justify-items-start gap-4 border-l-2 border-rosa py-2 pl-5 sm:pl-7"
          >
            <h2 id="compatibility-profile-required" className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
              {t("profileRequired.title")}
            </h2>
            <p className="max-w-[52ch] text-[1.0625rem] leading-[1.6] text-letra-suave">
              {t("profileRequired.description")}
            </p>
            <Link href="/profile/setup" className={buttonClasses({ size: "lg", className: "mt-2" })}>
              {t("profileRequired.cta")}
            </Link>
          </section>
        </Reveal>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <Reveal delay={80}>
            <CompatibilityForm credits={user?.credits ?? 0} cost={COMPATIBILITY_COST} />
          </Reveal>

          <Reveal delay={160}>
            <aside aria-labelledby="compatibility-how" className="border-t border-filete pt-6">
              <h2 id="compatibility-how" className="text-[clamp(1.35rem,1.15rem+0.6vw,1.6rem)] leading-[1.15]">
                {t("how.title")}
              </h2>
              <ol className="mt-5 divide-y divide-filete/25 border-y border-filete/25">
                {howItWorks.map((key, i) => (
                  <li key={key} className="flex gap-4 py-3.5 text-[1rem] leading-[1.55]">
                    <span
                      aria-hidden="true"
                      className="w-7 shrink-0 pt-[0.3em] font-dato text-[0.6875rem] leading-none tracking-[0.08em] text-letra-acento"
                    >
                      {ROMANOS[i]}
                    </span>
                    <span>{t(`how.${key}`)}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </Reveal>
        </div>
      )}

      {/* Previous readings */}
      {(hasProfile || history.length > 0) && (
        <Reveal delay={240}>
          <section aria-labelledby="previous-readings">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h2 id="previous-readings" className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.1]">
                {t("previous.title")}
              </h2>
              {history.length > 0 && (
                <p className="font-dato text-[0.6875rem] leading-[1.4] tracking-[0.12em] text-letra-suave uppercase">
                  {t("previous.count", { count: history.length })}
                </p>
              )}
            </div>
            <CompatibilityHistory readings={history} locale={locale} />
          </section>
        </Reveal>
      )}
    </div>
  );
}
