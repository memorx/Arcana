import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge, buttonClasses } from "@/components/ui";
import { Escena } from "@/components/tinta/Escena";
import { Etiqueta } from "@/components/tinta/Etiqueta";
import { Pincel } from "@/components/tinta/Pincel";
import { HoraDelDia } from "@/components/tinta/HoraDelDia";
import { MesaDeGrabados } from "@/components/tinta/MesaDeGrabados";
import { ReversoCarta } from "@/components/tinta/ReversoCarta";
import { StreakDisplay } from "@/components/dashboard/StreakDisplay";
import { CollectionWidget } from "@/components/dashboard/CollectionWidget";
import { AchievementsWidget } from "@/components/dashboard/AchievementsWidget";
import { LevelWidget } from "@/components/dashboard/LevelWidget";
import { ChallengesWidget } from "@/components/dashboard/ChallengesWidget";
import { BirthdayBanner } from "@/components/dashboard/BirthdayBanner";
import { TodayEnergiesWidget } from "@/components/dashboard/TodayEnergiesWidget";
import { BlueprintWidget } from "@/components/dashboard/BlueprintWidget";
import { InsightsWidget } from "@/components/dashboard/InsightsWidget";
import { Abanico } from "@/components/dashboard/Abanico";
import { Glifo } from "@/components/dashboard/Glifos";
import { cartasDeLectura, nombresDeCartas, slugsParaMesa } from "@/components/dashboard/mesa";
import { CELDA, ENLACE_DATO, RETICULA, ROTULO, TITULO_CELDA, ultimaCelda } from "@/components/dashboard/estilos";

/** Readings read for the table of engravings; the list shows the first three. */
const LECTURAS_DE_LA_MESA = 6;
const LECTURAS_RECIENTES = 3;

/** Título de sección fuera de la retícula (Explora, tiradas). */
const TITULO_SECCION = "font-titulo text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-tight text-letra";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tPulse = await getTranslations("pulse");
  const locale = await getLocale();
  const userId = session.user.id;

  // Fetch user data and recent readings
  const [user, readings, spreadTypes, userProfile, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        freeReadingsLeft: true,
        credits: true,
        name: true,
        currentStreak: true,
        longestStreak: true,
      },
    }),
    prisma.reading.findMany({
      where: { userId },
      include: { spreadType: true },
      orderBy: { createdAt: "desc" },
      take: LECTURAS_DE_LA_MESA,
    }),
    prisma.spreadType.findMany({
      orderBy: { cardCount: "asc" },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
  ]);

  const isSubscribed = subscription?.status === "active";

  const totalReadings = await prisma.reading.count({
    where: { userId },
  });

  // The table: the engravings of your latest cards (fixed ones for a new account)
  const nombres = await nombresDeCartas(readings);
  const slugsMesa = slugsParaMesa(readings.flatMap((r) => cartasDeLectura(r.cards, nombres).map((c) => c.name)));
  const mesaConHistoria = nombres.size > 0;
  const recentReadings = readings.slice(0, LECTURAS_RECIENTES);

  const displayName = user?.name || session.user.email?.split("@")[0] || "";
  const freeLeft = user?.freeReadingsLeft || 0;
  const credits = user?.credits || 0;
  const streak = user?.currentStreak || 0;
  const dateLocale = locale === "en" ? "en-US" : "es-ES";

  const stats = [
    { key: "free", label: t("freeReadingsLabel"), value: freeLeft },
    { key: "credits", label: t("creditsLabel"), value: credits },
    { key: "total", label: t("totalReadingsLabel"), value: totalReadings },
  ];

  // Same cards and texts as the landing's "More than tarot" (pulse.moreThanTarot.*)
  const explore = [
    { href: "/calendar", key: "calendar" },
    { href: "/compatibility", key: "compatibility" },
    { href: "/reading/manual", key: "manual" },
    { href: "/blueprint", key: "blueprint" },
  ] as const;

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Birthday greeting (renders nothing on other days) */}
      <BirthdayBanner userId={userId} />

      {/* La mesa: banda de tinta con los grabados de tus cartas recientes, el saludo y la hora */}
      <Escena
        suelo="tinta"
        aria-labelledby="mesa-titulo"
        className="-mx-gutter flex min-h-[clamp(360px,54vh,460px)] flex-col justify-end"
      >
        <MesaDeGrabados slugs={slugsMesa} columnas={8} filas={2} className="[--mdg-opacidad:.58]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(14_13_12/.45)_0%,rgb(14_13_12/.82)_40%,rgb(14_13_12/.97)_100%)] md:bg-[linear-gradient(90deg,rgb(14_13_12/.97)_0%,rgb(14_13_12/.88)_40%,rgb(14_13_12/.3)_76%,rgb(14_13_12/.55)_100%)]"
        />
        <div className="relative flex flex-col items-start gap-4 px-gutter pt-16 pb-8 sm:pb-10">
          <Etiqueta>{t("mesa.etiqueta")}</Etiqueta>
          <Pincel aria-hidden="true" className="-ml-[0.04em] text-[clamp(3.75rem,2.2rem+6vw,6.5rem)]">
            {t("mesa.pincel")}
          </Pincel>
          <h1 id="mesa-titulo" className="max-w-[18ch] font-titulo text-[clamp(2rem,1.4rem+2.2vw,3.25rem)] leading-[1.05] text-letra">
            {t("welcome", { name: displayName })}
          </h1>
          <p className="max-w-[46ch] font-lectura text-[1.0625rem] leading-relaxed text-letra">{t("welcomeSubtitle")}</p>
          <HoraDelDia variante="larga" className="max-w-[60ch] text-letra-suave" />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
            <Link href="/reading/new" prefetch={true} className={buttonClasses({ size: "lg" })}>
              {t("startReading")} <span aria-hidden="true" className="font-lectura text-[1.1em] tracking-normal">→</span>
            </Link>
            <p className="max-w-[40ch] font-dato text-[0.6875rem] leading-relaxed tracking-[0.06em] text-letra-suave">
              {mesaConHistoria ? t("mesa.notaRecientes") : t("mesa.notaFijas")}
            </p>
          </div>
        </div>
      </Escena>

      {/* Contadores: gratis, créditos y lecturas */}
      <dl className={cn(RETICULA, "-mt-4 grid-cols-3 sm:-mt-8")}>
        {stats.map((stat) => (
          <div key={stat.key} className="min-w-0 bg-suelo px-1 py-4 sm:px-6 sm:py-5">
            <dt className={ROTULO}>{stat.label}</dt>
            <dd className="mt-2 font-titulo text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-none text-letra tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Complete Profile Prompt */}
      {!userProfile && (
        <section
          aria-labelledby="perfil-titulo"
          className="flex flex-col gap-4 border-l-[3px] border-rosa py-1 pl-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h2 id="perfil-titulo" className={TITULO_CELDA}>
              {t("completeProfile")}
            </h2>
            <p className="mt-1 font-lectura text-letra-suave">{t("completeProfileDesc")}</p>
          </div>
          <Link href="/profile/setup" className={buttonClasses({ variant: "linea", size: "sm", className: "self-start sm:self-auto" })}>
            {t("setupProfile")}
          </Link>
        </section>
      )}

      {/* La retícula: los widgets en un pliego con filetes */}
      <div data-reticula className={cn(RETICULA, "md:grid-cols-2 lg:grid-cols-12")}>
        <div className={cn(CELDA, "md:col-span-2 lg:col-span-7")}>
          <TodayEnergiesWidget userId={userId} />
        </div>
        <div className={cn(CELDA, "md:col-span-2 lg:col-span-5")}>
          <BlueprintWidget userId={userId} />
        </div>

        {/* Recent Readings */}
        <section aria-labelledby="recientes-titulo" className={cn(CELDA, "md:col-span-2 lg:col-span-7 lg:row-span-2")}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 id="recientes-titulo" className={TITULO_CELDA}>
              {t("recentReadings")}
            </h2>
            {totalReadings > LECTURAS_RECIENTES && (
              <Link href="/history" className={ENLACE_DATO}>
                {t("viewAll")} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>

          {recentReadings.length === 0 ? (
            <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <span className="block aspect-[300/520] w-16 shrink-0 overflow-hidden rounded-[6px]">
                <ReversoCarta />
              </span>
              <div>
                <p className="font-lectura text-letra-suave">{t("noReadings")}</p>
                <Link href="/reading/new" className={buttonClasses({ variant: "linea", size: "sm", className: "mt-3" })}>
                  {t("firstReading")}
                </Link>
              </div>
            </div>
          ) : (
            <ol className="mt-4 divide-y divide-filete/15 border-t border-filete/15">
              {recentReadings.map((reading) => {
                const spreadName = locale === "en" ? reading.spreadType.name : reading.spreadType.nameEs;

                return (
                  <li key={reading.id}>
                    <Link
                      href={`/reading/${reading.id}`}
                      className="group flex items-start gap-4 py-4 transition-colors hover:text-letra-acento"
                    >
                      <Abanico
                        cartas={cartasDeLectura(reading.cards, nombres)}
                        vacias={reading.spreadType.cardCount}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Badge variant="primary" className="max-w-full whitespace-normal">
                            {spreadName}
                          </Badge>
                          <span className="font-dato text-[0.6875rem] tracking-[0.06em] text-letra-suave">
                            {new Date(reading.createdAt).toLocaleDateString(dateLocale, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 font-lectura text-letra">{reading.intention}</p>
                      </div>
                      <span aria-hidden="true" className="self-center font-lectura text-xl text-letra-suave group-hover:text-letra-acento">
                        →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Racha */}
        <section aria-labelledby="racha-titulo" className={cn(CELDA, "lg:col-span-5")}>
          <h2 id="racha-titulo" className={cn(TITULO_CELDA, "mb-4")}>
            {t("streak.title")}
          </h2>
          {streak > 0 ? (
            <StreakDisplay currentStreak={streak} longestStreak={user?.longestStreak || 0} />
          ) : (
            <p className="font-lectura text-letra-suave">{t("streak.empty")}</p>
          )}
        </section>
        <div className={cn(CELDA, "lg:col-span-5")}>
          <LevelWidget userId={userId} />
        </div>

        <div className={cn(CELDA, "lg:col-span-4")}>
          <ChallengesWidget userId={userId} />
        </div>
        <div className={cn(CELDA, "lg:col-span-4")}>
          <InsightsWidget userId={userId} />
        </div>
        <div className={cn(CELDA, "md:col-span-2 lg:col-span-4")}>
          <CollectionWidget userId={userId} />
        </div>

        <div className={cn(CELDA, "lg:col-span-5")}>
          <AchievementsWidget userId={userId} />
        </div>

        {/* Daily Oracle */}
        <section aria-labelledby="oraculo-titulo" className={cn(CELDA, "lg:col-span-7")}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id="oraculo-titulo" className={TITULO_CELDA}>
              {t("dailyOracleTitle")}
            </h2>
            {isSubscribed && <Badge variant="success">{tCommon("active")}</Badge>}
          </div>
          <p className="mt-2 max-w-[52ch] font-lectura text-letra-suave">{t("dailyOracleDesc")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/daily" prefetch={true} className={buttonClasses({ variant: isSubscribed ? "primario" : "linea", size: "sm" })}>
              {isSubscribed ? t("todayCardDone") : t("viewDaily")}
            </Link>
            {!isSubscribed && (
              <Link href="/subscribe" prefetch={true} className={buttonClasses({ size: "sm" })}>
                {t("subscribeCta")}
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Explore: the other ways of reading in Arcana */}
      <section aria-labelledby="dashboard-explore-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="dashboard-explore-title" className={TITULO_SECCION}>
            {t("explore.title")}
          </h2>
          <Etiqueta>{tPulse("moreThanTarot.subtitle")}</Etiqueta>
        </div>
        <ul className={cn(RETICULA, "sm:grid-cols-2 lg:grid-cols-4")}>
          {explore.map((item, index) => (
            <li key={item.href} className={cn("bg-suelo", index === explore.length - 1 && ultimaCelda(explore.length))}>
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-2.5 px-1 py-6 transition-colors hover:bg-papel-hondo sm:px-5"
              >
                <Glifo nombre={item.key} className="text-letra" />
                <h3 className="font-titulo text-xl leading-tight text-letra">
                  {tPulse(`moreThanTarot.${item.key}.title`)}
                </h3>
                <p className="flex-1 text-[0.9375rem] leading-snug text-letra-suave">
                  {tPulse(`moreThanTarot.${item.key}.description`)}
                </p>
                <span className="mt-1 font-dato text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-letra-acento group-hover:underline group-hover:underline-offset-[0.35em]">
                  {tPulse("moreThanTarot.cta")} <span aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Quick Actions - Spread Types */}
      <section aria-labelledby="tiradas-titulo">
        <h2 id="tiradas-titulo" className={cn(TITULO_SECCION, "mb-5")}>
          {t("startNewReading")}
        </h2>
        <ul className={cn(RETICULA, "sm:grid-cols-2 lg:grid-cols-4")}>
          {spreadTypes.map((spread, index) => {
            const canAfford = freeLeft > 0 || credits >= spread.creditCost;

            const spreadName = locale === "en" ? spread.name : spread.nameEs;
            const spreadDescription = locale === "en" ? spread.description : spread.descriptionEs;

            return (
              <li key={spread.id} className={cn("bg-suelo", index === spreadTypes.length - 1 && ultimaCelda(spreadTypes.length))}>
                <Link
                  href={`/reading/new?spread=${spread.id}`}
                  className={cn(
                    "flex h-full flex-col gap-2.5 px-1 py-5 transition-colors hover:bg-papel-hondo sm:px-5",
                    !canAfford && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span aria-hidden="true" className="flex items-end gap-1 pt-1">
                      {Array.from({ length: Math.min(spread.cardCount, 5) }).map((_, i) => (
                        <span key={i} className="block h-6 w-4 rounded-[2px] border border-filete/60" />
                      ))}
                      {spread.cardCount > 5 && (
                        <span className="pl-0.5 font-dato text-[0.6875rem] text-letra-suave">+{spread.cardCount - 5}</span>
                      )}
                    </span>
                    <Badge variant={freeLeft > 0 ? "success" : "default"}>
                      {freeLeft > 0 ? t("free") : `${spread.creditCost} cr`}
                    </Badge>
                  </div>
                  <h3 className="font-titulo text-lg leading-tight text-letra">{spreadName}</h3>
                  <p className="line-clamp-2 text-[0.9375rem] leading-snug text-letra-suave">{spreadDescription}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Referral Prompt */}
      <section
        aria-labelledby="referidos-titulo"
        className="flex flex-col gap-4 border-y border-filete py-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-4">
          <Glifo nombre="compatibility" className="mt-0.5 hidden text-letra sm:block" />
          <div className="min-w-0">
            <h2 id="referidos-titulo" className={TITULO_CELDA}>
              {t("referralTitle")}
            </h2>
            <p className="mt-1 font-lectura text-letra-suave">{t("referralDesc")}</p>
          </div>
        </div>
        <Link href="/referral" className={buttonClasses({ variant: "linea", size: "sm", className: "self-start sm:shrink-0 sm:self-auto" })}>
          {t("inviteFriends")}
        </Link>
      </section>
    </div>
  );
}
