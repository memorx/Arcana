import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getDayEnergies, getNumberMeaning, todayUtc } from "@/lib/systems";
import { LunaGlifo } from "@/components/energies/LunaGlifo";
import { ENLACE_DATO, ROTULO, TITULO_CELDA } from "./estilos";

interface TodayEnergiesWidgetProps {
  userId: string;
}

/** Dashboard: today's tonalli, moon and personal day, with a link to /calendar. */
export async function TodayEnergiesWidget({ userId }: TodayEnergiesWidgetProps) {
  const t = await getTranslations("energies");
  const locale = (await getLocale()) === "en" ? "en" : "es";

  let birthDate: Date | null = null;
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { birthDate: true },
    });
    birthDate = profile?.birthDate ?? null;
  } catch (error) {
    // Without the profile the widget still shows the tonalli and the moon
    console.error("[energies] Could not load the birth date:", error);
  }

  const { tonalli, moon, personalDay } = getDayEnergies(todayUtc(), birthDate);
  const personal = personalDay !== null ? getNumberMeaning(personalDay) : null;

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className={TITULO_CELDA}>{t("title")}</h2>
        <Link href="/calendar" className={ENLACE_DATO}>
          {t("calendarLink")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <ul className="grid grid-cols-3 gap-px bg-filete/20">
        <li className="min-w-0 bg-suelo pr-2 sm:pr-4">
          <p className={ROTULO}>{t("tonalli")}</p>
          <p className="mt-2 break-words font-titulo text-lg leading-tight sm:text-xl">
            {tonalli.number} {tonalli.sign.name[locale]}
          </p>
          <p className="mt-1 break-words font-dato text-[0.625rem] uppercase tracking-[0.08em] text-letra-suave">
            {tonalli.sign.nahuatl}
          </p>
        </li>
        <li className="min-w-0 bg-suelo px-2 sm:px-4">
          <p className={ROTULO}>{t("moon")}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <LunaGlifo luna={moon} className="size-6" />
            <span className="break-words font-titulo text-lg leading-tight sm:text-xl">{moon.name[locale]}</span>
          </p>
        </li>
        <li className="min-w-0 bg-suelo pl-2 sm:pl-4">
          <p className={ROTULO}>{t("personalDay")}</p>
          {personal ? (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-rosa font-dato text-xs text-letra-acento"
              >
                {personal.number}
              </span>
              <span className="break-words font-titulo text-lg leading-tight sm:text-xl">
                <span className="sr-only">{personal.number} · </span>
                {personal.name[locale]}
              </span>
            </p>
          ) : (
            <p className="mt-1">
              <Link
                href="/profile/setup"
                className="inline-flex min-h-11 items-center font-lectura text-[0.9375rem] leading-snug text-letra-acento underline underline-offset-[0.2em] hover:no-underline"
              >
                {t("addBirthDate")}
              </Link>
            </p>
          )}
        </li>
      </ul>
    </div>
  );
}
