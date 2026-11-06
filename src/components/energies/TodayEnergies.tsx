import Link from "next/link";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { describeDayEnergies, getDayEnergies, getNumberMeaning } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { LunaGlifo } from "./LunaGlifo";

interface TodayEnergiesProps {
  /** The day, at 00:00 UTC (use `todayUtc()`). */
  date: Date;
  /** From `UserProfile.birthDate`; without it the personal day becomes a CTA. */
  birthDate?: Date | null;
  className?: string;
}

const ROTULO = "font-dato text-[0.6875rem] uppercase leading-[1.4] tracking-[0.12em] text-letra-suave";

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="min-w-0 bg-suelo py-4 sm:px-5 sm:first:pl-0">
      <p className={ROTULO}>{label}</p>
      <div className="mt-2 font-titulo text-xl leading-tight text-letra sm:text-[1.375rem]">{children}</div>
    </li>
  );
}

/**
 * Today's tonalli, moon and personal day on /daily («El día de hoy» de la maqueta), with
 * the same plain-text summary (`describeDayEnergies`) the AI receives for the daily card.
 */
export function TodayEnergies({ date, birthDate = null, className }: TodayEnergiesProps) {
  const t = useTranslations("energies");
  const locale = useLocale() === "en" ? "en" : "es";
  const energies = getDayEnergies(date, birthDate);
  const { tonalli, moon, personalDay } = energies;
  const personal = personalDay !== null ? getNumberMeaning(personalDay) : null;
  const lines = describeDayEnergies(energies, locale).split("\n");

  return (
    <section aria-labelledby="today-energies-title" className={cn("text-letra", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 border-b border-filete pb-2">
        <h2 id="today-energies-title" className={cn(ROTULO, "font-dato")}>
          <span
            aria-hidden="true"
            className="mr-[0.7em] inline-block size-[0.55em] rounded-full bg-rosa align-[0.05em]"
          />
          {t("title")}
        </h2>
        <Link
          href="/calendar"
          className="inline-flex min-h-11 items-center gap-1.5 font-dato text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-letra-acento underline-offset-[0.35em] hover:underline"
        >
          {t("calendarLink")} <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      <ul className="grid gap-px border-b border-filete/20 bg-filete/20 sm:grid-cols-3">
        <Dato label={t("tonalli")}>{tonalli.label[locale]}</Dato>
        <Dato label={t("moon")}>
          <span className="flex items-center gap-3">
            <LunaGlifo luna={moon} className="size-7" />
            <span>
              {moon.name[locale]} · {t("illumination", { percent: Math.round(moon.illumination * 100) })}
            </span>
          </span>
        </Dato>
        <Dato label={t("personalDay")}>
          {personal ? (
            t("personalDayValue", { number: personal.number, name: personal.name[locale] })
          ) : (
            <Link
              href="/profile/setup"
              className="inline-flex min-h-11 items-center font-lectura text-base leading-snug text-letra-acento underline underline-offset-[0.2em] hover:no-underline"
            >
              {t("addBirthDate")}
            </Link>
          )}
        </Dato>
      </ul>

      <div className="mt-2 max-w-[68ch] space-y-1 pt-3 font-lectura text-base leading-relaxed text-letra-suave">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}
