"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, buttonClasses } from "@/components/ui";
import {
  getDayEnergies,
  getNumberMeaning,
  TONALPOHUALLI_INTRO,
  type Locale,
} from "@/lib/systems";
import { cn } from "@/lib/utils";
import { LunaGlifo } from "@/components/energies/LunaGlifo";
import { formatFullDate, fromDayKey } from "./calendar-utils";

/** "error": the birth date could not be loaded; the personal day is left out. */
export type ProfileStatus = "loading" | "guest" | "no-profile" | "ready" | "error";

export interface DayDetailProps {
  /** "YYYY-MM-DD" */
  dayKey: string;
  birthDate: Date | null;
  profileStatus: ProfileStatus;
  locale: Locale;
  isToday: boolean;
}

const ROTULO = "font-dato text-[0.6875rem] uppercase leading-[1.4] tracking-[0.12em] text-letra-suave";
const SECCION = "space-y-3 border-t border-filete/20 pt-5";

/** Everything about one day: tonalli, trecena, moon and personal day. */
export function DayDetail({ dayKey, birthDate, profileStatus, locale, isToday }: DayDetailProps) {
  const t = useTranslations("calendar");
  const energies = getDayEnergies(fromDayKey(dayKey), birthDate);
  const { tonalli, moon, personalDay } = energies;
  const personal = personalDay !== null ? getNumberMeaning(personalDay) : null;
  const illumination = Math.round(moon.illumination * 100);

  return (
    <article
      aria-labelledby="day-detail-title"
      className={cn(
        "space-y-6 border border-filete/30 bg-suelo p-5 text-letra sm:p-6",
        isToday && "border-t-[3px] border-t-rosa"
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="day-detail-title" className="font-titulo text-2xl leading-tight first-letter:uppercase">
          {formatFullDate(dayKey, locale)}
        </h2>
        {isToday && <Badge variant="primary">{t("today")}</Badge>}
      </header>

      {/* Tonalli */}
      <section aria-labelledby="day-detail-tonalli" className="space-y-3">
        <p id="day-detail-tonalli" className={ROTULO}>
          <span aria-hidden="true" className="mr-[0.7em] inline-block size-[0.55em] rounded-full bg-rosa align-[0.05em]" />
          {t("detail.tonalli")}
        </p>
        <div>
          <p className="font-titulo text-[2.5rem] leading-none">
            {tonalli.number} {tonalli.sign.nahuatl}
          </p>
          <p className="mt-2 font-dato text-xs uppercase tracking-[0.1em] text-letra-acento">
            {tonalli.number} {tonalli.sign.name[locale]}
          </p>
        </div>
        <p className="font-lectura leading-relaxed">{tonalli.sign.meaning[locale]}</p>
        <p className="font-lectura text-[0.9375rem] italic leading-relaxed text-letra-suave">{tonalli.sign.traits[locale]}</p>
        <dl className="divide-y divide-filete/15 border-y border-filete/15 text-[0.9375rem] leading-snug">
          <div className="py-3">
            <dt className={ROTULO}>{t("detail.trecena", { name: tonalli.trecena.nahuatl })}</dt>
            <dd className="mt-1 font-lectura">
              <span className="font-titulo">{tonalli.trecena.name[locale]}.</span> {tonalli.trecena.meaning[locale]}
            </dd>
          </div>
          <div className="py-3">
            <dt className={ROTULO}>{t("detail.lordOfNight")}</dt>
            <dd className="mt-1 font-lectura">
              <span className="font-titulo">{tonalli.lordOfNight.nahuatl}.</span> {tonalli.lordOfNight.meaning[locale]}
            </dd>
          </div>
          <div className="py-3">
            <dt className={ROTULO}>{t("detail.direction")}</dt>
            <dd className="mt-1 font-lectura">
              {tonalli.sign.direction[locale]} · {tonalli.sign.patron}
            </dd>
          </div>
        </dl>
      </section>

      {/* Moon */}
      <section aria-labelledby="day-detail-moon" className={SECCION}>
        <p id="day-detail-moon" className={ROTULO}>
          {t("detail.moon")}
        </p>
        <div className="flex items-start gap-4">
          <LunaGlifo luna={moon} className="size-10 text-letra" />
          <div className="min-w-0">
            <p className="font-titulo text-xl leading-tight">{moon.name[locale]}</p>
            <p className="mt-1 font-dato text-[0.6875rem] uppercase tracking-[0.1em] text-letra-suave">
              {t("detail.illumination", { percent: illumination })}
            </p>
            <p className="mt-2 font-lectura leading-relaxed">{moon.guidance[locale]}</p>
          </div>
        </div>
      </section>

      {/* Personal day */}
      {(personal || profileStatus !== "error") && (
        <section aria-labelledby="day-detail-personal" className={SECCION}>
          <p id="day-detail-personal" className={ROTULO}>
            {t("detail.personalDay")}
          </p>
          {personal ? (
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rosa font-titulo text-xl leading-none text-letra-acento"
              >
                {personal.number}
              </span>
              <div className="min-w-0">
                <p className="font-titulo text-xl leading-tight">
                  {t("detail.personalDayNumber", { number: personal.number })} · {personal.name[locale]}
                </p>
                <p className="mt-1 font-lectura leading-relaxed first-letter:uppercase">{personal.keywords[locale]}.</p>
              </div>
            </div>
          ) : profileStatus === "loading" ? (
            <div className="h-10 bg-papel-hondo motion-safe:animate-pulse" aria-hidden="true" />
          ) : profileStatus === "guest" ? (
            <div className="space-y-3">
              <p className="font-lectura text-letra-suave">{t("detail.guestCta")}</p>
              <Link href="/register" className={buttonClasses({ size: "sm" })}>
                {t("detail.guestButton")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-lectura text-letra-suave">{t("detail.noProfileCta")}</p>
              <Link href="/profile/setup" className={buttonClasses({ variant: "linea", size: "sm" })}>
                {t("detail.noProfileButton")}
              </Link>
            </div>
          )}
        </section>
      )}

      <details className="group border-t border-filete/20 pt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-dato text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-letra-acento hover:underline hover:underline-offset-[0.35em] [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
            ›
          </span>
          {t("about")}
        </summary>
        <p className="mt-1 font-lectura text-[0.9375rem] leading-relaxed text-letra-suave">{TONALPOHUALLI_INTRO[locale]}</p>
      </details>
    </article>
  );
}
