"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import {
  getDayEnergies,
  getNumberMeaning,
  TONALPOHUALLI_INTRO,
  type Locale,
} from "@/lib/systems";
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

/** Everything about one day: tonalli, trecena, moon and personal day. */
export function DayDetail({ dayKey, birthDate, profileStatus, locale, isToday }: DayDetailProps) {
  const t = useTranslations("calendar");
  const energies = getDayEnergies(fromDayKey(dayKey), birthDate);
  const { tonalli, moon, personalDay } = energies;
  const personal = personalDay !== null ? getNumberMeaning(personalDay) : null;
  const illumination = Math.round(moon.illumination * 100);

  return (
    <Card variant="highlighted" className="overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100 first-letter:uppercase">
              {formatFullDate(dayKey, locale)}
            </h2>
            {isToday && <Badge variant="secondary">{t("today")}</Badge>}
          </div>
        </header>

        {/* Tonalli */}
        <section aria-labelledby="day-detail-tonalli" className="space-y-2">
          <p id="day-detail-tonalli" className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
            {t("detail.tonalli")}
          </p>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-4xl leading-none">
              {tonalli.sign.glyph}
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold text-slate-100">{tonalli.label[locale]}</p>
              <p className="text-sm text-slate-300 mt-1">{tonalli.sign.meaning[locale]}</p>
              <p className="text-xs text-slate-500 mt-1">{tonalli.sign.traits[locale]}</p>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-3 pt-2 text-sm sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-3">
              <dt className="text-xs text-slate-500">
                {t("detail.trecena", { name: tonalli.trecena.nahuatl })}
              </dt>
              <dd className="text-slate-300 mt-1">
                <span className="text-slate-200">{tonalli.trecena.name[locale]}.</span>{" "}
                {tonalli.trecena.meaning[locale]}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-3">
              <dt className="text-xs text-slate-500">{t("detail.lordOfNight")}</dt>
              <dd className="text-slate-300 mt-1">
                <span className="text-slate-200">{tonalli.lordOfNight.nahuatl}.</span>{" "}
                {tonalli.lordOfNight.meaning[locale]}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-900/50 border border-slate-800 p-3 sm:col-span-2 lg:col-span-1">
              <dt className="text-xs text-slate-500">{t("detail.direction")}</dt>
              <dd className="text-slate-300 mt-1">
                {tonalli.sign.direction[locale]} · {tonalli.sign.patron}
              </dd>
            </div>
          </dl>
        </section>

        {/* Moon */}
        <section aria-labelledby="day-detail-moon" className="space-y-2 border-t border-slate-800/80 pt-5">
          <p id="day-detail-moon" className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
            {t("detail.moon")}
          </p>
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-4xl leading-none">
              {moon.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-100">{moon.name[locale]}</p>
              <p className="text-xs text-slate-500">{t("detail.illumination", { percent: illumination })}</p>
              <p className="text-sm text-slate-300 mt-1">{moon.guidance[locale]}</p>
            </div>
          </div>
        </section>

        {/* Personal day */}
        {(personal || profileStatus !== "error") && (
          <section
            aria-labelledby="day-detail-personal"
            className="space-y-2 border-t border-slate-800/80 pt-5"
          >
            <p id="day-detail-personal" className="text-xs uppercase tracking-[0.2em] text-amber-400/80">
              {t("detail.personalDay")}
            </p>
            {personal ? (
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-amber-500 text-lg font-bold text-slate-950"
                >
                  {personal.number}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-100">
                    {t("detail.personalDayNumber", { number: personal.number })} · {personal.name[locale]}
                  </p>
                  <p className="text-sm text-slate-300 mt-1 first-letter:uppercase">
                    {personal.keywords[locale]}.
                  </p>
                </div>
              </div>
            ) : profileStatus === "loading" ? (
              <div className="h-10 rounded-lg bg-slate-800/60 motion-safe:animate-pulse" aria-hidden="true" />
            ) : profileStatus === "guest" ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">{t("detail.guestCta")}</p>
                <Link href="/register">
                  <Button size="sm">{t("detail.guestButton")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">{t("detail.noProfileCta")}</p>
                <Link href="/profile/setup">
                  <Button size="sm" variant="secondary">
                    {t("detail.noProfileButton")}
                  </Button>
                </Link>
              </div>
            )}
          </section>
        )}

        <details className="group border-t border-slate-800/80 pt-4 text-sm">
          <summary className="cursor-pointer list-none text-purple-300 hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded">
            {t("about")}
          </summary>
          <p className="mt-2 text-slate-400 leading-relaxed">{TONALPOHUALLI_INTRO[locale]}</p>
        </details>
      </CardContent>
    </Card>
  );
}
